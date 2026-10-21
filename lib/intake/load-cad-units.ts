// CAD（S-05）の一覧に出すアイトレの加工区分を、サーバー（Server Component）で読む。
//
//   ・作業待ち・作業中（cad_waiting / cad_working）と、CSV 登録済（ready。起票前）のアイトレを、全部の営業所の分 1 回で読む
//     （加工場所のタブと、作業待ち・作業中 / CSV 登録済のタブの件数を出すため。タブの切り替えは画面で絞り込む）
//   ・受付の情報（受付No.・売り先・工事名・納期・配達・至急・加工場所）と、受付のファイルを一緒に読む
//   ・論理削除した受付・ファイルは出さない。起票完了（done）は出さない
// 加工区分・受付のテーブルは RLS で事務・管理者だけが読める。現場のユーザーが呼んでも 0 件になる。
// 並び順は画面（lib/intake/cad.ts の rowsForCadTab）で付ける。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { DueDateType } from '@/lib/order-entry/constants'
import { createViewUrls, toFile, type FileRow } from './load-intakes'
import type { CadUnit } from './types'

type Client = SupabaseClient<Database>

// 一覧に出す状態（起票完了は出さない）
const CAD_STATUSES = ['cad_waiting', 'cad_working', 'ready'] as const
// サイドメニューの「CAD」の件数に数える状態（その営業所のタブの、作業待ち・作業中の件数と同じ）
const CAD_ACTIVE_STATUSES = ['cad_waiting', 'cad_working'] as const

// intakes!inner は「受付が条件に当てはまる行だけにする」書き方（受付が論理削除されていれば、加工区分の行も出さない）。
// 担当（users）は加工区分から何本も外部キーがあるため、どの外部キーでたどるかを付ける。
// 受付の work_units は、同じ受付のほかの加工区分（「先寸あり」の印に使う）
const CAD_COLUMNS = `
  id, status, cad_assignee, cad_started_at, ready_at,
  assignee:users!work_units_cad_assignee_fkey(name),
  intakes!inner(
    id, intake_no, project_name, due_date_type, due_date, is_urgent, site_id, registered_at, deleted_at,
    customers(name), sites(name), delivery_methods(name),
    work_units(kind, status),
    intake_files(id, kind, slot, work_unit_id, original_name, size_bytes, storage_path, split_done, deleted_at)
  )
`

type CadFileRow = FileRow & { work_unit_id: string | null }

type CadRowData = {
  id: string
  status: string
  cad_assignee: string | null
  cad_started_at: string | null
  ready_at: string | null
  assignee: { name: string } | null
  intakes: {
    id: string
    intake_no: string | null
    project_name: string | null
    due_date_type: string | null
    due_date: string | null
    is_urgent: boolean
    site_id: string | null
    registered_at: string | null
    customers: { name: string } | null
    sites: { name: string } | null
    delivery_methods: { name: string } | null
    work_units: { kind: string; status: string }[]
    intake_files: CadFileRow[]
  }
}

// ファイル名の順（日本語の読みの順に近い並び）
const byName = (a: CadFileRow, b: CadFileRow) => a.original_name.localeCompare(b.original_name, 'ja')

function toCadUnit(row: CadRowData, viewUrls: Map<string, string>): CadUnit {
  const intake = row.intakes
  const files = intake.intake_files.filter((file) => file.deleted_at === null)
  // この加工区分に付いたファイル（振り分けたアイトレの図面・追加分・CSV）
  const unitFiles = files.filter((file) => file.work_unit_id === row.id).sort(byName)
  return {
    id: row.id,
    status: row.status as CadUnit['status'],
    assigneeId: row.cad_assignee,
    assigneeName: row.assignee?.name ?? null,
    startedAt: row.cad_started_at,
    readyAt: row.ready_at,
    intakeId: intake.id,
    intakeNo: intake.intake_no,
    customerName: intake.customers?.name ?? null,
    projectName: intake.project_name,
    dueDateType: intake.due_date_type as DueDateType | null,
    dueDate: intake.due_date,
    deliveryMethodName: intake.delivery_methods?.name ?? null,
    isUrgent: intake.is_urgent,
    siteId: intake.site_id,
    siteName: intake.sites?.name ?? null,
    registeredAt: intake.registered_at,
    hasSakisun: intake.work_units.some((unit) => unit.kind === 'sakisun' && unit.status !== 'done'),
    drawings: unitFiles.filter((file) => file.kind !== 'csv').map((file) => toFile(file, viewUrls)),
    csvFiles: unitFiles.filter((file) => file.kind === 'csv').map((file) => toFile(file, viewUrls)),
    orderPdfs: files
      .filter((file) => file.kind === 'order_pdf')
      .sort(byName)
      .map((file) => toFile(file, viewUrls)),
  }
}

export async function loadCadUnits(supabase: Client): Promise<CadUnit[]> {
  const { data, error } = await supabase
    .from('work_units')
    .select(CAD_COLUMNS)
    .eq('kind', 'aitore')
    .in('status', [...CAD_STATUSES])
    .is('intakes.deleted_at', null)
  if (error) throw new Error(`CAD の一覧を読めませんでした: ${error.message}`)

  const rows = data as unknown as CadRowData[]
  // 注文書の PDF に、画面から開くための期限つきの URL を作る（ほかのファイルの「開く」は押したときに作る）
  const viewUrls = await createViewUrls(
    supabase,
    rows.flatMap((row) => row.intakes.intake_files.filter((file) => file.kind === 'order_pdf'))
  )
  return rows.map((row) => toCadUnit(row, viewUrls))
}

// サイドメニューの「CAD」の件数（作業待ち・作業中のアイトレ）。
// ビュー work_unit_queue_view は論理削除した受付と起票完了を除いてあるため、状態で絞るだけでよい
// siteId を渡すと、その営業所（加工場所）の分だけを数える（サイドメニューのバッジ・部署ホームのカード。
// 省略・null なら全部の営業所。どちらも lib/intake/queue.ts の countScopeSiteId で決める）
export async function countActiveCadUnits(supabase: Client, siteId: string | null = null): Promise<number> {
  let query = supabase
    .from('work_unit_queue_view')
    .select('work_unit_id', { count: 'exact', head: true })
    .eq('kind', 'aitore')
    .in('status', [...CAD_ACTIVE_STATUSES])
  if (siteId) query = query.eq('site_id', siteId)
  const { count, error } = await query
  if (error) throw new Error(`CAD の件数を数えられませんでした: ${error.message}`)
  return count ?? 0
}
