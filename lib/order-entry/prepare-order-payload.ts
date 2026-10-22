// 受注の保存の前に、サーバー（Server Action）で入力を確かめ、重量・仕入単価を計算し直して、
// DB の関数に渡す JSON（p_order・p_items）を組み立てる。新規（create_order）と変更（update_order）で共通に使う。
//
// 画面側でも同じ確認・計算をしているが、画面を経由しない呼び出しもありうるため、
// サーバー側でもう一度確認し、重量・仕入単価も計算し直す（画面から送られた単価は使わない）。
// 単価の基準日は受注日（変更でも、受注日を変えなければ登録したときと同じ単価になる）。
// Server Action のファイル（'use server'）から呼ぶ。このファイル自体はサーバーの中だけで使う。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  buildOrderItemPayload,
  buildOrderPayload,
  buildProcessPayload,
  type OrderItemPayload,
} from './build-order-payload'
import { calculateItem, pricingConditionsKey, pricingConditionsOf } from './calculate-item'
import { INITIAL_ITEM_ROW } from './item-row'
import { isProcessRow } from './item-structure'
import type { ItemContext, ItemErrors, ItemRowValues } from './item-types'
import { loadOrderEntryMasters } from './load-order-entry-masters'
import { buildOrderAuxPayload, validateOrderAux, type OrderAuxInput } from './order-aux'
import { resolveProcessRow } from './process-row'
import { resolveItemRow } from './resolve-item'
import { hasErrors, validateOrderHeader, type OrderHeaderErrors, type OrderHeaderInput } from './validate-order-header'
import { hasItemErrors, validateOrderItems } from './validate-order-items'
import { fetchPricingMasters } from '@/lib/pricing/fetch-pricing-masters'
import type { PricingMasters } from '@/lib/pricing/types'

// 保存できなかったときの結果（画面はこの中身で、エラーの欄に戻る）
export type OrderSaveFailure = {
  ok: false
  headerErrors?: OrderHeaderErrors
  // 明細の行の key ごとのエラー
  itemErrors?: Record<string, ItemErrors>
  // 明細全体のエラー（明細が 1 行もない など）
  itemsError?: string
  message?: string
}

export type PreparedOrder = {
  ok: true
  // ヘッダー（フリーコメント・スタンプを含む）。受付・加工区分などは呼び出す側で足す
  order: ReturnType<typeof buildOrderPayload> & ReturnType<typeof buildOrderAuxPayload>
  items: OrderItemPayload[]
}

export async function prepareOrderPayload(
  supabase: SupabaseClient<Database>,
  header: OrderHeaderInput,
  items: ItemRowValues[],
  aux: OrderAuxInput,
): Promise<PreparedOrder | OrderSaveFailure> {
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

  // --- 補助エリア（スタンプ・フリーコメント）の確認 ---
  const auxError = validateOrderAux(aux, masters.aux.stamps)

  if (hasErrors(headerErrors) || hasItemErrors(itemsValidation) || auxError) {
    return {
      ok: false,
      headerErrors,
      itemErrors: itemsValidation.rowErrors,
      itemsError: itemsValidation.itemsError,
      message: auxError ?? '入力内容を確認してください',
    }
  }

  // --- 重量・仕入単価をサーバー側で計算し直す ---
  // 同じ条件の行は価格マスタの行を使い回す（1 回の保存の中だけのキャッシュ）
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
    )
    if (!payload) {
      return { ok: false, message: `${lineNo} 行目の単価を計算できません` }
    }
    itemPayloads.push({ ...payload, processes: [] })
  }

  return {
    ok: true,
    // フリーコメントとスタンプは、ヘッダーの JSON（p_order）に入れて渡す
    order: { ...buildOrderPayload(header, deliveryMethodRequiresNote), ...buildOrderAuxPayload(aux) },
    items: itemPayloads,
  }
}
