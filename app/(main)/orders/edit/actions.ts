'use server'

// 受注の変更・削除（処理区分 1 変更・2 削除。PR 9b）の Server Action。
//
//   updateOrder: 受注情報・明細・スタンプ・フリーコメントを直して保存する（DB の関数 update_order）
//   deleteOrder: 受注を論理削除する（DB の関数 delete_order）
//
// 変えられるのは事務・管理者だけ（DB の関数の中でも確かめる）。
// 入力の確かめと重量・仕入単価の計算し直しは、新規と共通の prepareOrderPayload で行う。
// 受注No.・枝番・受付・加工区分は変えない（DB の関数が書き換えない）。
// expectedUpdatedAt は画面を開いたときの受注の更新日時。ほかの人が先に保存していたら、DB の関数が断る。

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import type { ItemRowValues } from '@/lib/order-entry/item-types'
import type { OrderAuxInput } from '@/lib/order-entry/order-aux'
import { prepareOrderPayload, type OrderSaveFailure } from '@/lib/order-entry/prepare-order-payload'
import type { OrderHeaderInput } from '@/lib/order-entry/validate-order-header'
import { createClient } from '@/lib/supabase-server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function canEditOrders(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null && (user.role === 'office' || user.role === 'admin')
}

// DB の関数のエラーを、画面に出す文にする
function toErrorMessage(error: { message: string }, fallback: string): string {
  if (error.message.includes('ORDER_CHANGED')) {
    return 'ほかの人が先にこの受注を変更しました。受注No. で呼び出し直してから、もう一度直してください'
  }
  if (error.message.includes('ORDER_HAS_SHIPMENTS')) {
    return '送り状が発行されているため、変更・削除できません（送り状を先に取り消してください）'
  }
  if (error.message.includes('ORDER_DELETED')) return 'この受注はすでに削除されています'
  if (error.message.includes('ORDER_NOT_FOUND')) return '受注が見つかりません'
  return `${fallback}: ${error.message}`
}

// 受注の呼び出し・変更・削除の画面と、受注登録待ちの一覧を作り直す
function revalidateOrderPages() {
  revalidatePath('/', 'layout')
}

export type UpdateOrderResult = { ok: true; orderNo: string } | OrderSaveFailure

export async function updateOrder(
  orderId: string,
  expectedUpdatedAt: string,
  header: OrderHeaderInput,
  items: ItemRowValues[],
  aux: OrderAuxInput,
): Promise<UpdateOrderResult> {
  if (!(await canEditOrders())) return { ok: false, message: '受注を変更する権限がありません' }
  if (!UUID_PATTERN.test(orderId)) return { ok: false, message: '受注が正しくありません' }

  const supabase = await createClient()
  const prepared = await prepareOrderPayload(supabase, header, items, aux)
  if (!prepared.ok) return prepared

  const { data: orderNo, error } = await supabase.rpc('update_order', {
    p_order_id: orderId,
    p_expected_updated_at: expectedUpdatedAt,
    p_order: prepared.order,
    p_items: prepared.items,
  })
  if (error || !orderNo) {
    return { ok: false, message: toErrorMessage(error ?? { message: '不明なエラー' }, '変更を保存できませんでした') }
  }
  revalidateOrderPages()
  return { ok: true, orderNo }
}

export async function deleteOrder(
  orderId: string,
  expectedUpdatedAt: string,
): Promise<{ ok: true; orderNo: string } | { ok: false; message: string }> {
  if (!(await canEditOrders())) return { ok: false, message: '受注を削除する権限がありません' }
  if (!UUID_PATTERN.test(orderId)) return { ok: false, message: '受注が正しくありません' }

  const supabase = await createClient()
  const { data: orderNo, error } = await supabase.rpc('delete_order', {
    p_order_id: orderId,
    p_expected_updated_at: expectedUpdatedAt,
  })
  if (error || !orderNo) {
    return { ok: false, message: toErrorMessage(error ?? { message: '不明なエラー' }, '削除できませんでした') }
  }
  revalidateOrderPages()
  return { ok: true, orderNo }
}
