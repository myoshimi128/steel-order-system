'use server'

// 送り状発行の Server Action（docs/screen-design.md「送り状発行」）。
//
//   createShipment: 送り状を発行する（DB の関数 create_shipment）。送り状No. を返す
//   deleteShipment: 送り状を取り消す（DB の関数 delete_shipment）。取り消した送り状の受注No. を返す
//
// 発行・取り消しができるのは事務・管理者だけ（DB の関数の中でも確かめる）。
// 出荷数量が残りを超えないことは、ここ（受注を読み直して checkShipmentEntry）と DB の関数の両方で確かめる。
// 実重量は、受注の明細に実重量がない行（アイトレ・ササラ）の入力だけを送る。ほかの行は DB の関数が計算する。

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { normalizeOrderNo } from '@/lib/order-entry/order-no'
import { loadShipmentOrder } from '@/lib/shipments/load-shipments'
import { checkShipmentEntry, type ShipmentEntryValues } from '@/lib/shipments/shipment-lines'
import { createClient } from '@/lib/supabase-server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

async function canIssueShipments(): Promise<boolean> {
  const user = await getCurrentUser()
  return user !== null && (user.role === 'office' || user.role === 'admin')
}

// DB の関数のエラーを、画面に出す文にする
function toErrorMessage(error: { message: string }, fallback: string): string {
  const message = error.message
  if (message.includes('ORDER_CHANGED')) {
    return 'ほかの人が先にこの受注を変更しました。画面を開き直してから、もう一度発行してください'
  }
  if (message.includes('SHIPMENT_EXCEEDS_ORDER')) {
    return '出荷数量の合計が受注数量を超えます（ほかの人が先に送り状を発行したかもしれません）。画面を開き直してください'
  }
  if (message.includes('ORDER_COMPLETED')) return 'この受注は全部出荷済みです'
  if (message.includes('DUE_DATE_REQUIRED')) return '納期を確定にしてください（日付を入れてください）'
  if (message.includes('SHIPMENT_ITEMS_EMPTY')) return '今回出す明細がありません'
  if (message.includes('ORDER_DELETED')) return 'この受注は削除されています'
  if (message.includes('ORDER_NOT_FOUND')) return '受注が見つかりません'
  if (message.includes('SHIPMENT_NOT_FOUND')) return '送り状が見つかりません（すでに取り消されています）'
  return `${fallback}: ${message}`
}

// 送り状発行の入口・入力・確認の画面と、受注の呼び出しの画面（送り状があるかの表示）を作り直す
function revalidateShipmentPages() {
  revalidatePath('/', 'layout')
}

export type CreateShipmentInput = {
  orderNo: string
  orderId: string
  // 画面を開いたときの受注の更新日時
  expectedUpdatedAt: string
  shippedDate: string
  // 確定にする納期（受注の納期が確定でないときだけ。確定なら null）
  dueDate: string | null
  // 明細の id → 入力の値
  values: Record<string, ShipmentEntryValues>
}

export type CreateShipmentResult =
  | { ok: true; shipmentNo: string }
  | { ok: false; message: string; errors?: Record<string, string> }

export async function createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
  if (!(await canIssueShipments())) return { ok: false, message: '送り状を発行する権限がありません' }
  if (!UUID_PATTERN.test(input.orderId)) return { ok: false, message: '受注が正しくありません' }
  if (!DATE_PATTERN.test(input.shippedDate)) return { ok: false, message: '出荷日を入れてください' }
  if (input.dueDate !== null && !DATE_PATTERN.test(input.dueDate)) {
    return { ok: false, message: '納期の日付が正しくありません' }
  }
  const orderNo = normalizeOrderNo(input.orderNo)
  if (!orderNo) return { ok: false, message: '受注No. が正しくありません' }

  // 受注を読み直し、今の残りの数量で入力を確かめる（画面を開いた後に、ほかの人が発行していることがあるため）
  const supabase = await createClient()
  const order = await loadShipmentOrder(supabase, orderNo)
  if (!order || order.id !== input.orderId) return { ok: false, message: '受注が見つかりません' }
  if (order.dueDateType !== '確定' && input.dueDate === null) {
    return { ok: false, message: '納期を確定にしてください（日付を入れてください）' }
  }
  const checked = checkShipmentEntry(order.items, input.values)
  if (!checked.ok) return { ok: false, message: checked.message, errors: checked.errors }

  const { data: shipmentNo, error } = await supabase.rpc('create_shipment', {
    p_order_id: order.id,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_shipped_date: input.shippedDate,
    p_items: checked.items,
    // 確定の受注では渡さない（DB の関数の既定値 null）
    p_due_date: order.dueDateType === '確定' ? undefined : (input.dueDate ?? undefined),
  })
  if (error || !shipmentNo) {
    return { ok: false, message: toErrorMessage(error ?? { message: '不明なエラー' }, '送り状を発行できませんでした') }
  }
  revalidateShipmentPages()
  return { ok: true, shipmentNo }
}

export async function deleteShipment(
  shipmentId: string
): Promise<{ ok: true; orderNo: string } | { ok: false; message: string }> {
  if (!(await canIssueShipments())) return { ok: false, message: '送り状を取り消す権限がありません' }
  if (!UUID_PATTERN.test(shipmentId)) return { ok: false, message: '送り状が正しくありません' }

  const supabase = await createClient()
  const { data: orderNo, error } = await supabase.rpc('delete_shipment', { p_shipment_id: shipmentId })
  if (error || !orderNo) {
    return { ok: false, message: toErrorMessage(error ?? { message: '不明なエラー' }, '送り状を取り消せませんでした') }
  }
  revalidateShipmentPages()
  return { ok: true, orderNo }
}
