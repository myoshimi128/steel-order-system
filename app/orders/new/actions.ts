'use server'

// 受注登録（新規）の Server Action。
//
//   fetchPricingRows: 明細 1 行分の条件に該当する価格マスタの行を取得する（画面の単価の自動計算に使う）
//   createOrder     : ヘッダーと明細をまとめて 1 回で登録する
//
// 画面側でも同じ確認・計算をしているが、画面を経由しない呼び出しもありうるため、
// サーバー側でもう一度確認し、重量・仕入単価も計算し直す（画面から送られた単価は使わない）。
// 登録は DB の関数 create_order で 1 つの transaction として行い、途中で失敗したら全体を取り消す。

import { getCurrentUser } from '@/lib/auth'
import {
  buildOrderItemPayload,
  buildOrderPayload,
  buildProcessPayload,
  type OrderItemPayload,
} from '@/lib/order-entry/build-order-payload'
import { calculateItem, pricingConditionsKey, pricingConditionsOf } from '@/lib/order-entry/calculate-item'
import { INITIAL_ITEM_ROW } from '@/lib/order-entry/item-row'
import { isProcessRow } from '@/lib/order-entry/item-structure'
import type { ItemContext, ItemErrors, ItemRowValues } from '@/lib/order-entry/item-types'
import { loadOrderEntryMasters } from '@/lib/order-entry/load-order-entry-masters'
import { resolveProcessRow } from '@/lib/order-entry/process-row'
import { resolveItemRow } from '@/lib/order-entry/resolve-item'
import {
  hasErrors,
  validateOrderHeader,
  type OrderHeaderErrors,
  type OrderHeaderInput,
} from '@/lib/order-entry/validate-order-header'
import { hasItemErrors, validateOrderItems } from '@/lib/order-entry/validate-order-items'
import {
  fetchPricingMasters,
  type PricingRowConditions,
} from '@/lib/pricing/fetch-pricing-masters'
import type { PricingMasters } from '@/lib/pricing/types'
import { createClient } from '@/lib/supabase-server'

// 受注を起票できるのは事務・管理者のみ（現場は受注を起票しない）
async function canEnterOrders(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null && (user.role === 'office' || user.role === 'admin')
}

// ------------------------------------------------------------
// 価格マスタの行の取得
// ------------------------------------------------------------

export type FetchPricingRowsResult =
  | { ok: true; masters: PricingMasters }
  | { ok: false; message: string }

export async function fetchPricingRows(
  conditions: PricingRowConditions,
): Promise<FetchPricingRowsResult> {
  if (!(await canEnterOrders())) {
    return { ok: false, message: '価格を取得する権限がありません' }
  }
  try {
    const supabase = await createClient()
    return { ok: true, masters: await fetchPricingMasters(supabase, conditions) }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : '価格の取得に失敗しました' }
  }
}

// ------------------------------------------------------------
// 受注の登録
// ------------------------------------------------------------

export type CreateOrderResult =
  | { ok: true; orderNo: string }
  | {
      ok: false
      headerErrors?: OrderHeaderErrors
      // 明細の行の key ごとのエラー
      itemErrors?: Record<string, ItemErrors>
      // 明細全体のエラー（明細が 1 行もない など）
      itemsError?: string
      message?: string
    }

export async function createOrder(
  header: OrderHeaderInput,
  items: ItemRowValues[],
): Promise<CreateOrderResult> {
  if (!(await canEnterOrders())) {
    return { ok: false, message: '受注を登録する権限がありません' }
  }
  const supabase = await createClient()
  const masters = await loadOrderEntryMasters(supabase)

  // --- ヘッダーの確認 ---
  // 配達がフリー（文字の入力が必要）かどうかは、DB から取得したマスタの値で判定する
  const deliveryMethodRequiresNote =
    header.deliveryMethodId !== null &&
    masters.header.deliveryMethodIdsRequiringNote.includes(header.deliveryMethodId)
  const headerErrors = validateOrderHeader(header, { deliveryMethodRequiresNote })

  // --- 明細の確認 ---
  // スプライス専用の受注かどうかとショットの有無（ヘッダーの値）で、明細の区分の解釈と単価が変わる
  const context: ItemContext = { isSplice: header.isSplice, spliceShot: header.spliceShot }
  const itemsValidation = validateOrderItems(items, masters.items, INITIAL_ITEM_ROW, context)

  if (hasErrors(headerErrors) || hasItemErrors(itemsValidation)) {
    return {
      ok: false,
      headerErrors,
      itemErrors: itemsValidation.rowErrors,
      itemsError: itemsValidation.itemsError,
      message: '入力内容を確認してください',
    }
  }

  // --- 重量・仕入単価をサーバー側で計算し直す ---
  // 同じ条件の行は価格マスタの行を使い回す（1 回の登録の中だけのキャッシュ）
  const pricingCache = new Map<string, PricingMasters>()
  const itemPayloads: OrderItemPayload[] = []
  for (const row of itemsValidation.targetRows) {
    // 加工の行は、直前に登録した材料の行（母材）の processes に入れる。
    // 確認（validateOrderItems）で、母材のない加工の行がないことは確認済み
    if (isProcessRow(row)) {
      const parent = itemPayloads[itemPayloads.length - 1]
      const processPayload = buildProcessPayload(
        // 穴・曲げの数量は画面から送られた値を使わず、項目と母材の枚数からここで計算し直す
        resolveProcessRow(row, masters.items, parent.quantity),
        // 加工の行の行番号は、母材ごとに 1 から振る
        parent.processes.length + 1,
        row.fieldNote,
      )
      if (!processPayload) {
        return { ok: false, message: `${parent.line_no} 行目の加工の行を登録できません` }
      }
      parent.processes.push(processPayload)
      continue
    }

    // 行番号は、保存する材料の行（空の行を除いたもの）の並び順で 1 から振る
    const lineNo = itemPayloads.length + 1
    const resolved = resolveItemRow(row, masters.items, context)
    const conditions = pricingConditionsOf(resolved, header.orderDate)
    if (!conditions) {
      return { ok: false, message: `${lineNo} 行目の単価を計算できません` }
    }
    const key = pricingConditionsKey(conditions)
    let pricingMasters = pricingCache.get(key)
    if (!pricingMasters) {
      pricingMasters = await fetchPricingMasters(supabase, conditions)
      pricingCache.set(key, pricingMasters)
    }
    const payload = buildOrderItemPayload(
      resolved,
      calculateItem(resolved, pricingMasters, header.orderDate),
      lineNo,
      row.fieldNote,
    )
    if (!payload) {
      return { ok: false, message: `${lineNo} 行目の単価を計算できません` }
    }
    itemPayloads.push({ ...payload, processes: [] })
  }

  // --- 登録（ヘッダーと明細を 1 つの transaction で） ---
  const { data: orderNo, error } = await supabase.rpc('create_order', {
    p_order: buildOrderPayload(header, deliveryMethodRequiresNote),
    p_items: itemPayloads,
  })
  if (error || !orderNo) {
    return { ok: false, message: `登録に失敗しました: ${error?.message ?? '不明なエラー'}` }
  }
  return { ok: true, orderNo }
}
