// 送り状発行の画面で、受注・送り状を DB から読む（Server Component から使う）。
//
//   loadShipmentCandidates: 送り状を作れる受注の一覧（削除しておらず、完了していない受注。加工待ちも含む）
//   loadShipmentOrder     : 送り状を作る受注（明細・今までの送り状の数量・前回入力した実重量）
//   loadIssuedShipment    : 発行済みの送り状（確認の画面と印刷）
// 受注・送り状は RLS で事務・管理者だけが読める。見つからなければ null。
// 品名と寸法・加工の文は、現場用伝票と同じ決まりで組み立てる（lib/order-slip/slip-lines.ts）。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { SLIP_ITEM_COLUMNS, toSlipItem, type SlipItemRow } from '@/lib/order-slip/load-order-slip'
import { processText, productNameText } from '@/lib/order-slip/slip-lines'
import type { SlipItemSource } from '@/lib/order-slip/types'
import { calcTotalWeight } from '@/lib/pricing/weight'
import { pieceWeightFromTotal } from './shipment-lines'
import type { ShipmentCandidate } from './candidates'
import type { IssuedShipment, IssuedShipmentLine, ShipmentOrder, ShipmentOrderHeader, ShipmentOrderItem } from './types'

type Client = SupabaseClient<Database>

// ------------------------------------------------------------
// 共通: 受注の上部の項目
// ------------------------------------------------------------

const ORDER_HEADER_COLUMNS = `
  id, order_no, status, customer_contact, project_name, due_date_type, due_date, delivery_method_note,
  customers(name),
  delivery_destinations(name, address),
  delivery_methods(name),
  sites(name)
`

type OrderHeaderRow = {
  id: string
  order_no: string
  status: string
  customer_contact: string | null
  project_name: string | null
  due_date_type: string
  due_date: string | null
  delivery_method_note: string | null
  customers: { name: string } | null
  delivery_destinations: { name: string; address: string | null } | null
  delivery_methods: { name: string } | null
  sites: { name: string } | null
}

function toOrderHeader(row: OrderHeaderRow): ShipmentOrderHeader {
  return {
    id: row.id,
    orderNo: row.order_no,
    status: row.status,
    customerName: row.customers?.name ?? '',
    customerContact: row.customer_contact,
    // 入れ先が NULL（売り先と同じ）なら、売り先の名前を入れ先として出す（現場用伝票と同じ）
    destinationName: row.delivery_destinations?.name ?? row.customers?.name ?? '',
    destinationAddress: row.delivery_destinations?.address ?? null,
    projectName: row.project_name,
    dueDateType: row.due_date_type,
    dueDate: row.due_date,
    deliveryMethodName: row.delivery_methods?.name ?? '',
    deliveryMethodNote: row.delivery_method_note,
    siteName: row.sites?.name ?? null,
  }
}

// 1 枚あたりの角重量（請求の根拠）。ササラは使用材重量で請求するため、使用材重量があればそれを使う
function billingPieceWeight(item: SlipItemSource): number | null {
  return item.materialWeight ?? item.squareWeight
}

function processTexts(item: SlipItemSource): string[] {
  return [...item.processes].sort((a, b) => a.lineNo - b.lineNo).map(processText)
}

// ------------------------------------------------------------
// 送り状を作れる受注の一覧
// ------------------------------------------------------------

type CandidateRow = {
  id: string
  order_no: string
  status: string
  is_urgent: boolean
  site_id: string
  project_name: string | null
  due_date_type: string
  due_date: string | null
  delivery_method_note: string | null
  customers: { name: string } | null
  delivery_destinations: { name: string } | null
  delivery_methods: { name: string } | null
  order_items: { quantity: number; shipment_items: { quantity: number }[] }[]
}

export async function loadShipmentCandidates(supabase: Client): Promise<ShipmentCandidate[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `id, order_no, status, is_urgent, site_id, project_name, due_date_type, due_date, delivery_method_note,
       customers(name), delivery_destinations(name), delivery_methods(name),
       order_items(quantity, shipment_items(quantity))`
    )
    .is('deleted_at', null)
    .neq('status', '完了')
  if (error) throw new Error(`送り状を作れる受注を読めませんでした: ${error.message}`)

  return (data as unknown as CandidateRow[]).map((row) => {
    let ordered = 0
    let remaining = 0
    for (const item of row.order_items) {
      const shipped = item.shipment_items.reduce((sum, shipment) => sum + shipment.quantity, 0)
      ordered += item.quantity
      remaining += Math.max(0, item.quantity - shipped)
    }
    return {
      id: row.id,
      orderNo: row.order_no,
      status: row.status,
      isUrgent: row.is_urgent,
      siteId: row.site_id,
      customerName: row.customers?.name ?? '',
      destinationName: row.delivery_destinations?.name ?? row.customers?.name ?? '',
      projectName: row.project_name,
      dueDateType: row.due_date_type,
      dueDate: row.due_date,
      deliveryMethodName: row.delivery_methods?.name ?? '',
      deliveryMethodNote: row.delivery_method_note,
      orderedQuantity: ordered,
      remainingQuantity: remaining,
    }
  })
}

// ------------------------------------------------------------
// 送り状を作る受注
// ------------------------------------------------------------

type OrderItemWithShipments = SlipItemRow & {
  id: string
  shipment_items: { quantity: number; weight: number | null; shipments: { created_at: string } | null }[]
}

type ShipmentOrderRow = OrderHeaderRow & {
  updated_at: string
  deleted_at: string | null
  order_items: OrderItemWithShipments[]
  shipments: { id: string; shipment_no: string; shipped_date: string; created_at: string; shipment_items: { quantity: number }[] }[]
}

// 前回の送り状で入力した 1 枚あたりの実重量（重量を入れた送り状のうち、いちばん新しいもの）
function lastInputPieceWeight(row: OrderItemWithShipments): number | null {
  const withWeight = row.shipment_items
    .filter((shipment) => shipment.weight !== null)
    .sort((a, b) => (b.shipments?.created_at ?? '').localeCompare(a.shipments?.created_at ?? ''))
  const last = withWeight[0]
  return last ? pieceWeightFromTotal(last.weight, last.quantity) : null
}

function toShipmentOrderItem(row: OrderItemWithShipments): ShipmentOrderItem {
  const item = toSlipItem(row)
  return {
    id: row.id,
    lineNo: item.lineNo,
    cuttingMethod: item.cuttingMethod ?? '',
    productName: productNameText(item),
    processes: processTexts(item),
    orderedQuantity: item.quantity,
    shippedQuantity: row.shipment_items.reduce((sum, shipment) => sum + shipment.quantity, 0),
    billingPieceWeight: billingPieceWeight(item),
    actualPieceWeight: item.actualWeight,
    // 実重量を入力する行（受注の明細に実重量がない行）だけ、前回の入力を初期値にする
    lastInputPieceWeight: item.actualWeight === null ? lastInputPieceWeight(row) : null,
  }
}

export async function loadShipmentOrder(supabase: Client, orderNo: string): Promise<ShipmentOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `${ORDER_HEADER_COLUMNS}, updated_at, deleted_at,
       order_items(id, ${SLIP_ITEM_COLUMNS}, shipment_items(quantity, weight, shipments(created_at))),
       shipments(id, shipment_no, shipped_date, created_at, shipment_items(quantity))`
    )
    .eq('order_no', orderNo)
    .maybeSingle()
  if (error) throw new Error(`受注を読めませんでした: ${error.message}`)
  if (!data) return null

  const row = data as unknown as ShipmentOrderRow
  return {
    ...toOrderHeader(row),
    updatedAt: row.updated_at,
    deleted: row.deleted_at !== null,
    items: row.order_items.map(toShipmentOrderItem).sort((a, b) => a.lineNo - b.lineNo),
    shipments: [...row.shipments]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((shipment) => ({
        id: shipment.id,
        shipmentNo: shipment.shipment_no,
        shippedDate: shipment.shipped_date,
        totalQuantity: shipment.shipment_items.reduce((sum, item) => sum + item.quantity, 0),
      })),
  }
}

// ------------------------------------------------------------
// 発行済みの送り状
// ------------------------------------------------------------

type IssuedShipmentRow = {
  id: string
  shipment_no: string
  shipped_date: string
  created_at: string
  users: { name: string } | null
  orders: OrderHeaderRow | null
  shipment_items: { quantity: number; weight: number | null; order_items: SlipItemRow | null }[]
}

function toIssuedLine(row: IssuedShipmentRow['shipment_items'][number]): IssuedShipmentLine | null {
  if (!row.order_items) return null
  const item = toSlipItem(row.order_items)
  const piece = billingPieceWeight(item)
  return {
    lineNo: item.lineNo,
    cuttingMethod: item.cuttingMethod ?? '',
    productName: productNameText(item),
    processes: processTexts(item),
    quantity: row.quantity,
    // 角重量は保存していないため、受注の明細の 1 枚あたりの重量 × 今回の数量から求める（送り状の画面と同じ計算）
    squareWeight: piece === null ? null : calcTotalWeight(piece, row.quantity),
    actualWeight: row.weight,
  }
}

export async function loadIssuedShipment(supabase: Client, shipmentNo: string): Promise<IssuedShipment | null> {
  const { data, error } = await supabase
    .from('shipments')
    .select(
      `id, shipment_no, shipped_date, created_at,
       users(name),
       orders(${ORDER_HEADER_COLUMNS}),
       shipment_items(quantity, weight, order_items(${SLIP_ITEM_COLUMNS}))`
    )
    .eq('shipment_no', shipmentNo)
    .maybeSingle()
  if (error) throw new Error(`送り状を読めませんでした: ${error.message}`)
  if (!data) return null

  const row = data as unknown as IssuedShipmentRow
  if (!row.orders) return null
  return {
    id: row.id,
    shipmentNo: row.shipment_no,
    shippedDate: row.shipped_date,
    createdAt: row.created_at,
    createdByName: row.users?.name ?? null,
    order: toOrderHeader(row.orders),
    lines: row.shipment_items
      .map(toIssuedLine)
      .filter((line): line is IssuedShipmentLine => line !== null)
      .sort((a, b) => a.lineNo - b.lineNo),
  }
}
