// 処理区分 1 変更・2 削除で、受注No. から受注を読む（PR 9b）。
//
//   ・受注情報・明細（材料の行と、その加工の行）・スタンプ・フリーコメント（画面の入力値に戻す元。order-to-form.ts）
//   ・画面を開いたときの updated_at（ほかの人が先に保存していないかを、保存のときに DB の関数が比べる）
//   ・削除済みか、送り状（出荷実績）があるか（どちらも変更・削除できない）
//   ・削除の確認の画面に出す要約（売り先・工事名・加工場所・明細の行数・加工区分の今の状態）
// 受注・明細は RLS で事務・管理者が読める（現場は呼び出しの画面を開けない）。見つからなければ null。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { WorkUnitKind, WorkUnitStatus } from '@/lib/intake/constants'
import type { StoredItem, StoredOrderHeader, StoredProcess } from './order-to-form'

type Client = SupabaseClient<Database>

export type LoadedOrder = {
  id: string
  orderNo: string
  // 画面を開いたときの更新日時（保存のときに比べる）
  updatedAt: string
  deleted: boolean
  hasShipments: boolean
  intakeId: string
  workUnitId: string
  workUnitKind: WorkUnitKind | null
  workUnitStatus: WorkUnitStatus | null
  header: StoredOrderHeader
  items: StoredItem[]
  stampIds: string[]
  fieldNote: string
  // 削除の確認に出す名前
  customerName: string | null
  siteName: string | null
}

// orders から work_units へは、(加工区分, 受付) の組の外部キーでたどる
const ORDER_COLUMNS = `
  id, order_no, updated_at, deleted_at, intake_id, work_unit_id,
  order_date, member_class, joint_no, splice_shot, staff_id, is_urgent,
  customer_id, customer_contact, delivery_destination_id, project_name,
  due_date_type, due_date, delivery_method_id, delivery_method_note, site_id, field_note,
  customers(name), sites(name),
  work_units!orders_unit_same_intake_fkey(kind, status),
  order_items(
    line_no, product_id, cutting_method, cutting_type, special_product_type_id, plate_size, steel_making,
    width, length, outer_diameter, inner_diameter, quantity, manufacturer_specified_id,
    order_item_processes(line_no, process_type_id, spec, spec_fields, quantity, unit_price, price_unit)
  ),
  order_stamps(stamp_id),
  shipments(id)
`

type ProcessRow = {
  line_no: number
  process_type_id: string
  spec: string | null
  spec_fields: unknown
  quantity: number | null
  unit_price: number | null
  price_unit: string
}

type ItemRow = {
  line_no: number
  product_id: string
  cutting_method: string | null
  cutting_type: string | null
  special_product_type_id: string | null
  plate_size: string | null
  steel_making: string | null
  width: number | null
  length: number | null
  outer_diameter: number | null
  inner_diameter: number | null
  quantity: number
  manufacturer_specified_id: string | null
  order_item_processes: ProcessRow[]
}

type OrderRowData = {
  id: string
  order_no: string
  updated_at: string
  deleted_at: string | null
  intake_id: string
  work_unit_id: string
  order_date: string
  member_class: string
  joint_no: string | null
  splice_shot: boolean | null
  staff_id: string
  is_urgent: boolean
  customer_id: string
  customer_contact: string | null
  delivery_destination_id: string | null
  project_name: string | null
  due_date_type: string
  due_date: string | null
  delivery_method_id: string
  delivery_method_note: string | null
  site_id: string
  field_note: string | null
  customers: { name: string } | null
  sites: { name: string } | null
  work_units: { kind: string; status: string } | null
  order_items: ItemRow[]
  order_stamps: { stamp_id: string }[]
  shipments: { id: string }[]
}

// spec_fields は JSON（オブジェクト）のときだけ使う
function specFieldsOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function toProcess(row: ProcessRow): StoredProcess {
  return {
    lineNo: row.line_no,
    processTypeId: row.process_type_id,
    spec: row.spec,
    specFields: specFieldsOf(row.spec_fields),
    quantity: row.quantity,
    unitPrice: row.unit_price,
    priceUnit: row.price_unit,
  }
}

function toItem(row: ItemRow): StoredItem {
  return {
    lineNo: row.line_no,
    productId: row.product_id,
    cuttingMethod: row.cutting_method,
    cuttingType: row.cutting_type,
    specialProductTypeId: row.special_product_type_id,
    plateSize: row.plate_size,
    steelMaking: row.steel_making,
    width: row.width,
    length: row.length,
    outerDiameter: row.outer_diameter,
    innerDiameter: row.inner_diameter,
    quantity: row.quantity,
    manufacturerSpecifiedId: row.manufacturer_specified_id,
    processes: row.order_item_processes.map(toProcess),
  }
}

export async function loadOrderForEdit(supabase: Client, orderNo: string): Promise<LoadedOrder | null> {
  const { data, error } = await supabase.from('orders').select(ORDER_COLUMNS).eq('order_no', orderNo).maybeSingle()
  if (error) throw new Error(`受注を読めませんでした: ${error.message}`)
  if (!data) return null

  const row = data as unknown as OrderRowData
  return {
    id: row.id,
    orderNo: row.order_no,
    updatedAt: row.updated_at,
    deleted: row.deleted_at !== null,
    hasShipments: row.shipments.length > 0,
    intakeId: row.intake_id,
    workUnitId: row.work_unit_id,
    workUnitKind: (row.work_units?.kind as WorkUnitKind | undefined) ?? null,
    workUnitStatus: (row.work_units?.status as WorkUnitStatus | undefined) ?? null,
    header: {
      orderDate: row.order_date,
      memberClass: row.member_class,
      jointNo: row.joint_no,
      spliceShot: row.splice_shot,
      staffId: row.staff_id,
      isUrgent: row.is_urgent,
      customerId: row.customer_id,
      customerContact: row.customer_contact,
      deliveryDestinationId: row.delivery_destination_id,
      projectName: row.project_name,
      dueDateType: row.due_date_type,
      dueDate: row.due_date,
      deliveryMethodId: row.delivery_method_id,
      deliveryMethodNote: row.delivery_method_note,
      siteId: row.site_id,
    },
    items: row.order_items.map(toItem),
    stampIds: row.order_stamps.map((stamp) => stamp.stamp_id),
    fieldNote: row.field_note ?? '',
    customerName: row.customers?.name ?? null,
    siteName: row.sites?.name ?? null,
  }
}
