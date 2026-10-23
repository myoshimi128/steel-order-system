// 現場用伝票の印刷で、受注No. から受注を読む（docs/screen-design.md「現場用伝票の印刷」）。
//
//   ・上部の項目: 売り先（客先担当・営業担当）・入れ先・工事名・納期・配達・加工場所・担当者・至急・部材区分・受付No.
//   ・明細: 材料の行（種類・材質・材質ライン・特殊製品・メーカーの名前を結び付ける）と加工の行
//   ・下部: スタンプ（番号順）・フリーコメント・ショット加工（スプライス専用の受注でショットが有）
//   ・印刷の記録: 伝票の種類ごとの回数と、前回の印刷（印刷した後に受注が変更されたかの判定）
// 受注・明細・印刷の記録は RLS で事務・管理者が読める。見つからなければ null。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { WORK_UNIT_KIND_LABELS, type WorkUnitKind } from '@/lib/intake/constants'
import { MEMBER_CLASS_OPTIONS, SPLICE_MEMBER_CLASS } from '@/lib/order-entry/constants'
import type { SlipCopyKind, SlipItemSource, SlipProcessSource } from './types'

type Client = SupabaseClient<Database>

// 印刷の記録の要約（伝票の種類ごと）
export type SlipPrintSummary = {
  count: number
  // 前回の印刷の日時と、そのときの受注の更新日時
  lastPrintedAt: string | null
  lastOrderUpdatedAt: string | null
}

export type LoadedOrderSlip = {
  id: string
  orderNo: string
  updatedAt: string
  deleted: boolean
  intakeNo: string | null
  // 区分（先寸 / アイトレ）
  workUnitLabel: string | null
  orderDate: string
  isUrgent: boolean
  // 部材区分の表示名（DF・SPL など。無分類は null）
  memberClassLabel: string | null
  jointNo: string | null
  // スプライス専用の受注でショットが有なら true（伝票に「ショット加工」を出す）
  shot: boolean
  customerName: string
  customerContact: string | null
  salesRep: string | null
  // 入れ先の名前。売り先と同じ（NULL）なら売り先の名前
  destinationName: string
  projectName: string | null
  dueDateType: string
  dueDate: string | null
  deliveryMethodName: string
  deliveryMethodNote: string | null
  siteName: string | null
  staffName: string | null
  fieldNote: string | null
  stamps: { number: number; body: string }[]
  items: SlipItemSource[]
  prints: Record<SlipCopyKind, SlipPrintSummary>
}

// orders から intakes・users へは外部キーが複数あるため、使う外部キーの名前を ! の後ろに書いて選ぶ
const SLIP_COLUMNS = `
  id, order_no, updated_at, deleted_at, order_date, member_class, joint_no, splice_shot, is_urgent,
  customer_contact, project_name, due_date_type, due_date, delivery_method_note, field_note,
  customers(name, sales_rep),
  delivery_destinations(name),
  delivery_methods(name),
  sites(name),
  staff:users!orders_staff_id_fkey(name),
  intakes!orders_intake_id_fkey(intake_no),
  work_units!orders_unit_same_intake_fkey(kind),
  order_items(
    line_no, cutting_method, cutting_type, plate_size, steel_making,
    width, length, outer_diameter, inner_diameter, quantity,
    square_weight, actual_weight, material_weight, cutting_unit_price, price_unit,
    products(thickness, plate_types(number, name), materials(name, default_steel_making, line_mark, display_color)),
    special_product_types(name, is_splice_order_type, weight_basis),
    manufacturer:manufacturers!order_items_manufacturer_specified_id_fkey(name),
    order_item_processes(line_no, spec, spec_fields, quantity, unit_price, price_unit, process_types(name))
  ),
  order_stamps(stamps(number, body)),
  order_slip_prints(copy_kind, printed_at, order_updated_at)
`

type ProcessRow = {
  line_no: number
  spec: string | null
  spec_fields: unknown
  quantity: number | null
  unit_price: number | null
  price_unit: string
  process_types: { name: string } | null
}

type ItemRow = {
  line_no: number
  cutting_method: string | null
  cutting_type: string | null
  plate_size: string | null
  steel_making: string | null
  width: number | null
  length: number | null
  outer_diameter: number | null
  inner_diameter: number | null
  quantity: number
  square_weight: number | null
  actual_weight: number | null
  material_weight: number | null
  cutting_unit_price: number | null
  price_unit: string | null
  products: {
    thickness: number
    plate_types: { number: number; name: string } | null
    materials: { name: string; default_steel_making: string; line_mark: string | null; display_color: string | null } | null
  } | null
  special_product_types: { name: string; is_splice_order_type: boolean; weight_basis: string } | null
  manufacturer: { name: string } | null
  order_item_processes: ProcessRow[]
}

type OrderRowData = {
  id: string
  order_no: string
  updated_at: string
  deleted_at: string | null
  order_date: string
  member_class: string
  joint_no: string | null
  splice_shot: boolean | null
  is_urgent: boolean
  customer_contact: string | null
  project_name: string | null
  due_date_type: string
  due_date: string | null
  delivery_method_note: string | null
  field_note: string | null
  customers: { name: string; sales_rep: string | null } | null
  delivery_destinations: { name: string } | null
  delivery_methods: { name: string } | null
  sites: { name: string } | null
  staff: { name: string } | null
  intakes: { intake_no: string | null } | null
  work_units: { kind: string } | null
  order_items: ItemRow[]
  order_stamps: { stamps: { number: number; body: string } | null }[]
  order_slip_prints: { copy_kind: string; printed_at: string; order_updated_at: string }[]
}

// spec_fields は JSON（オブジェクト）のときだけ使う
function specFieldsOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function toProcess(row: ProcessRow): SlipProcessSource {
  return {
    lineNo: row.line_no,
    processTypeName: row.process_types?.name ?? '加工',
    spec: row.spec,
    specFields: specFieldsOf(row.spec_fields),
    quantity: row.quantity,
    unitPrice: row.unit_price,
    priceUnit: row.price_unit,
  }
}

function toItem(row: ItemRow): SlipItemSource {
  const material = row.products?.materials ?? null
  const special = row.special_product_types
  return {
    lineNo: row.line_no,
    cuttingMethod: row.cutting_method,
    cuttingType: row.cutting_type,
    // 商品は明細の外部キー（NOT NULL）で必ずあるが、読めなかったときも印刷は止めない
    plateTypeNumber: row.products?.plate_types?.number ?? 0,
    plateTypeName: row.products?.plate_types?.name ?? '',
    materialName: material?.name ?? null,
    materialDefaultSteelMaking: material?.default_steel_making ?? null,
    lineMark: material?.line_mark ?? null,
    displayColor: material?.display_color ?? null,
    thickness: row.products?.thickness ?? 0,
    steelMaking: row.steel_making,
    manufacturerName: row.manufacturer?.name ?? null,
    specialProduct: special
      ? { name: special.name, isSpliceOrderType: special.is_splice_order_type, weightBasis: special.weight_basis }
      : null,
    plateSize: row.plate_size,
    width: row.width,
    length: row.length,
    outerDiameter: row.outer_diameter,
    innerDiameter: row.inner_diameter,
    quantity: row.quantity,
    squareWeight: row.square_weight,
    actualWeight: row.actual_weight,
    materialWeight: row.material_weight,
    unitPrice: row.cutting_unit_price,
    priceUnit: row.price_unit,
    processes: row.order_item_processes.map(toProcess),
  }
}

// 伝票の種類ごとに、印刷の回数と前回の印刷をまとめる
function summarizePrints(rows: OrderRowData['order_slip_prints']): Record<SlipCopyKind, SlipPrintSummary> {
  const summary = (kind: SlipCopyKind): SlipPrintSummary => {
    const prints = rows
      .filter((row) => row.copy_kind === kind)
      .sort((a, b) => a.printed_at.localeCompare(b.printed_at))
    const last = prints[prints.length - 1]
    return {
      count: prints.length,
      lastPrintedAt: last?.printed_at ?? null,
      lastOrderUpdatedAt: last?.order_updated_at ?? null,
    }
  }
  return { 現場用: summary('現場用'), 単価記入用: summary('単価記入用') }
}

export async function loadOrderSlip(supabase: Client, orderNo: string): Promise<LoadedOrderSlip | null> {
  const { data, error } = await supabase.from('orders').select(SLIP_COLUMNS).eq('order_no', orderNo).maybeSingle()
  if (error) throw new Error(`受注を読めませんでした: ${error.message}`)
  if (!data) return null

  const row = data as unknown as OrderRowData
  const isSplice = row.member_class === SPLICE_MEMBER_CLASS
  const memberClass = MEMBER_CLASS_OPTIONS.find((option) => option.value === row.member_class)
  const kind = row.work_units?.kind as WorkUnitKind | undefined
  return {
    id: row.id,
    orderNo: row.order_no,
    updatedAt: row.updated_at,
    deleted: row.deleted_at !== null,
    intakeNo: row.intakes?.intake_no ?? null,
    workUnitLabel: kind ? WORK_UNIT_KIND_LABELS[kind] : null,
    orderDate: row.order_date,
    isUrgent: row.is_urgent,
    memberClassLabel: memberClass && memberClass.value !== 'NONE' ? memberClass.label : null,
    jointNo: isSplice ? row.joint_no : null,
    shot: isSplice && row.splice_shot === true,
    customerName: row.customers?.name ?? '',
    customerContact: row.customer_contact,
    salesRep: row.customers?.sales_rep ?? null,
    // 入れ先が NULL（売り先と同じ）なら、売り先の名前を入れ先として出す（空欄にしない）
    destinationName: row.delivery_destinations?.name ?? row.customers?.name ?? '',
    projectName: row.project_name,
    dueDateType: row.due_date_type,
    dueDate: row.due_date,
    deliveryMethodName: row.delivery_methods?.name ?? '',
    deliveryMethodNote: row.delivery_method_note,
    siteName: row.sites?.name ?? null,
    staffName: row.staff?.name ?? null,
    fieldNote: row.field_note,
    stamps: row.order_stamps
      .map((stamp) => stamp.stamps)
      .filter((stamp): stamp is { number: number; body: string } => stamp !== null)
      .sort((a, b) => a.number - b.number),
    items: row.order_items.map(toItem),
    prints: summarizePrints(row.order_slip_prints),
  }
}

// 現場用の伝票の印刷の状態（受注No. で呼び出す画面で、変更を保存した後に「印刷し直す」を促すのに使う）。
// 受注が見つからなければ null
export async function loadSlipPrintStatus(
  supabase: Client,
  orderNo: string
): Promise<{ printed: boolean; changedSinceLastPrint: boolean } | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('updated_at, order_slip_prints(copy_kind, printed_at, order_updated_at)')
    .eq('order_no', orderNo)
    .maybeSingle()
  if (error) throw new Error(`印刷の記録を読めませんでした: ${error.message}`)
  if (!data) return null
  const summary = summarizePrints(data.order_slip_prints)['現場用']
  return { printed: summary.count > 0, changedSinceLastPrint: changedSinceLastPrint(summary, data.updated_at) }
}

// 前回の印刷の後に受注が変更されたか（印刷したときの受注の更新日時と、今の更新日時を比べる）。
// 印刷したことがなければ false
export function changedSinceLastPrint(summary: SlipPrintSummary, orderUpdatedAt: string): boolean {
  if (summary.lastOrderUpdatedAt === null) return false
  return new Date(summary.lastOrderUpdatedAt).getTime() !== new Date(orderUpdatedAt).getTime()
}
