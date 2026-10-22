'use server'

// 受注登録（新規）の Server Action。
//
//   fetchPricingRows: 明細 1 行分の条件に該当する価格マスタの行を取得する（画面の単価の自動計算に使う。変更の画面でも使う）
//   createOrder     : ヘッダー・明細・補助エリア（スタンプ・フリーコメント）をまとめて 1 回で登録する
//
// 入力の確かめと重量・仕入単価の計算し直しは、変更（app/(main)/orders/edit/actions.ts）と共通の
// prepareOrderPayload（lib/order-entry/prepare-order-payload.ts）で行う。
// 登録は DB の関数 create_order で 1 つの transaction として行い、途中で失敗したら全体を取り消す。
// 受注は受注登録待ちの加工区分（受付）から起票する。受注No.（{受付No.}-{枝番}）は create_order の中で採番する。

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import type { ItemRowValues } from '@/lib/order-entry/item-types'
import type { OrderAuxInput } from '@/lib/order-entry/order-aux'
import { prepareOrderPayload, type OrderSaveFailure } from '@/lib/order-entry/prepare-order-payload'
import type { OrderHeaderInput } from '@/lib/order-entry/validate-order-header'
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

export type CreateOrderResult = { ok: true; orderNo: string } | OrderSaveFailure

// どの受付・加工区分から起票するか（受注登録待ちの一覧で選んだ行）
export type OrderIntakeLink = {
  intakeId: string
  workUnitId: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function createOrder(
  header: OrderHeaderInput,
  items: ItemRowValues[],
  aux: OrderAuxInput,
  link: OrderIntakeLink,
): Promise<CreateOrderResult> {
  if (!(await canEnterOrders())) {
    return { ok: false, message: '受注を登録する権限がありません' }
  }
  if (!UUID_PATTERN.test(link.intakeId) || !UUID_PATTERN.test(link.workUnitId)) {
    return { ok: false, message: '受注登録待ちの一覧から受注登録を始めてください' }
  }
  const supabase = await createClient()
  const prepared = await prepareOrderPayload(supabase, header, items, aux)
  if (!prepared.ok) return prepared

  // --- 登録（枝番の採番・ヘッダー・明細・スタンプを 1 つの transaction で） ---
  // 受付・加工区分は、ヘッダーの JSON（p_order）に入れて渡す
  const { data: orderNo, error } = await supabase.rpc('create_order', {
    p_order: { ...prepared.order, intake_id: link.intakeId, work_unit_id: link.workUnitId },
    p_items: prepared.items,
  })
  if (error?.message.includes('WORK_UNIT_NOT_READY')) {
    return {
      ok: false,
      message: 'この区分は受注登録待ちではありません（ほかの人が起票を完了した可能性があります）。受注登録待ちの一覧を開き直してください',
    }
  }
  if (error || !orderNo) {
    return { ok: false, message: `登録に失敗しました: ${error?.message ?? '不明なエラー'}` }
  }
  // 受注登録待ちの一覧・メニューの件数・この画面の上部（次の枝番・登録済みの受注）を作り直す
  revalidatePath('/', 'layout')
  return { ok: true, orderNo }
}
