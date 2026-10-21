// 受注登録の画面（/orders/new?unit=…）を開いたときに、受注登録待ちの一覧で選んだ加工区分と、その受付の情報を読む。
//
//   ・受注情報の初期値の元（売り先・客先担当・入れ先・工事名・納期・配達・加工場所・至急）
//   ・上部に出す受付No.・区分・受付の担当者・次の枝番・この受付の登録済みの受注
//   ・注文書のパネルに出すファイル（受付の注文書 PDF と、この加工区分のファイル＝振り分けた図面・追加分・CSV）
// 加工区分・受付は RLS で事務・管理者だけが読める。見つからなければ null。
// 論理削除した受付・ファイル・受注は出さない。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { DueDateType, MemberClass } from '@/lib/order-entry/constants'
import type { OrderIntakeSource } from '@/lib/order-entry/intake-defaults'
import type { WorkUnitKind, WorkUnitOrigin } from './constants'
import { createViewUrls, toFile, type FileRow } from './load-intakes'

type Client = SupabaseClient<Database>

const FILE_COLUMNS = 'id, kind, slot, original_name, size_bytes, storage_path, split_done, deleted_at'

// 加工区分 → 受付 は intakes!inner（受付が論理削除されていれば行を出さない）。
// 加工区分の intake_files は、この区分に付いたファイル。受付の intake_files は注文書の PDF を探すのに使う。
// 受付から users へは何本も外部キーがあるため、担当者（staff_id）の外部キーでたどると指定する
const SOURCE_COLUMNS = `
  id, status, kind, origin,
  intake_files(${FILE_COLUMNS}),
  intakes!inner(
    id, intake_no, customer_id, customer_contact, project_name, due_date_type, due_date,
    delivery_method_id, delivery_method_note, site_id, is_urgent, last_branch, deleted_at,
    sites(code), staff:users!intakes_staff_id_fkey(name),
    intake_destinations(seq, destination_id),
    intake_files(${FILE_COLUMNS}),
    orders(order_no, branch_no, member_class, deleted_at)
  )
`

type SourceRowData = {
  id: string
  status: string
  kind: string
  origin: string
  intake_files: FileRow[]
  intakes: {
    id: string
    intake_no: string | null
    customer_id: string | null
    customer_contact: string | null
    project_name: string | null
    due_date_type: string | null
    due_date: string | null
    delivery_method_id: string | null
    delivery_method_note: string | null
    site_id: string | null
    is_urgent: boolean
    last_branch: number
    sites: { code: string } | null
    staff: { name: string } | null
    intake_destinations: { seq: number; destination_id: string | null }[]
    intake_files: FileRow[]
    orders: { order_no: string; branch_no: number; member_class: string; deleted_at: string | null }[]
  }
}

const byName = (a: FileRow, b: FileRow) => a.original_name.localeCompare(b.original_name, 'ja')

export async function loadOrderIntakeSource(supabase: Client, workUnitId: string): Promise<OrderIntakeSource | null> {
  const { data, error } = await supabase
    .from('work_units')
    .select(SOURCE_COLUMNS)
    .eq('id', workUnitId)
    .is('intakes.deleted_at', null)
    .maybeSingle()
  if (error) throw new Error(`受注登録待ちの区分を読めませんでした: ${error.message}`)
  if (!data) return null

  const row = data as unknown as SourceRowData
  const intake = row.intakes
  // 受付No. のない受付（受付登録の前）は、受注登録待ちに並ばないため扱わない
  if (!intake.intake_no) return null

  // 注文書の PDF（受付の注文書）と、この加工区分のファイル（論理削除したものは除く）
  const orderPdfs = intake.intake_files.filter((file) => file.kind === 'order_pdf' && file.deleted_at === null).sort(byName)
  const unitFiles = row.intake_files.filter((file) => file.deleted_at === null).sort(byName)
  const viewUrls = await createViewUrls(supabase, [...orderPdfs, ...unitFiles])

  return {
    intakeId: intake.id,
    workUnitId: row.id,
    intakeNo: intake.intake_no,
    kind: row.kind as WorkUnitKind,
    origin: row.origin as WorkUnitOrigin,
    isReady: row.status === 'ready',
    intakeStaffName: intake.staff?.name ?? null,
    customerId: intake.customer_id,
    customerContact: intake.customer_contact,
    destinationIds: [...intake.intake_destinations]
      .sort((a, b) => a.seq - b.seq)
      .map((destination) => destination.destination_id),
    projectName: intake.project_name,
    dueDateType: intake.due_date_type as DueDateType | null,
    dueDate: intake.due_date,
    deliveryMethodId: intake.delivery_method_id,
    deliveryMethodNote: intake.delivery_method_note,
    siteId: intake.site_id,
    siteCode: intake.sites?.code ?? null,
    isUrgent: intake.is_urgent,
    // 本当の枝番は登録のときに DB が採番する（ほかの人が先に登録すると、表示より大きい番号になる）
    nextBranchNo: intake.last_branch + 1,
    registeredOrders: intake.orders
      .filter((order) => order.deleted_at === null)
      .sort((a, b) => a.branch_no - b.branch_no)
      .map((order) => ({ orderNo: order.order_no, memberClass: order.member_class as MemberClass })),
    files: [...orderPdfs, ...unitFiles].map((file) => toFile(file, viewUrls)),
  }
}
