// 受注登録待ち（S-06a）の一覧に出す加工区分と、営業所のタブ・件数を、サーバー（Server Component）で読む。
//
//   ・受注登録待ち（status = 'ready'）の加工区分を、全部の営業所の分まとめて読む（タブの件数を出すため）
//   ・受付の情報（受付No.・売り先・工事名・納期・至急・加工場所・担当者）と、CSV の有無を一緒に読む
//   ・論理削除した受付は出さない。起票完了（done）は出さない
// 加工区分・受付のテーブルは RLS で事務・管理者だけが読める。現場のユーザーが呼んでも 0 件になる。
// 並び順は画面（lib/intake/queue.ts の rowsForQueueSite）で付ける。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { DueDateType } from '@/lib/order-entry/constants'
import type { WorkUnitKind, WorkUnitOrigin } from './constants'
import type { QueueSite } from './queue'
import type { QueueUnit } from './types'

type Client = SupabaseClient<Database>

// intakes!inner は「受付が条件に当てはまる行だけにする」書き方（受付が論理削除されていれば、加工区分の行も出さない）。
// 受付から users へは何本も外部キーがあるため、担当者（staff_id）の外部キーでたどると指定する。
// intake_files は、この加工区分に付いたファイル（CSV の有無を見る）
const QUEUE_COLUMNS = `
  id, kind, origin, note, ready_at,
  intake_files(kind, deleted_at),
  intakes!inner(
    id, intake_no, project_name, due_date_type, due_date, is_urgent, site_id, registered_at, deleted_at,
    customers(name), staff:users!intakes_staff_id_fkey(name)
  )
`

type QueueRowData = {
  id: string
  kind: string
  origin: string
  note: string | null
  ready_at: string | null
  intake_files: { kind: string; deleted_at: string | null }[]
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
    staff: { name: string } | null
  }
}

function toQueueUnit(row: QueueRowData): QueueUnit {
  const intake = row.intakes
  return {
    id: row.id,
    kind: row.kind as WorkUnitKind,
    origin: row.origin as WorkUnitOrigin,
    note: row.note,
    readyAt: row.ready_at,
    hasCsv: row.intake_files.some((file) => file.kind === 'csv' && file.deleted_at === null),
    intakeId: intake.id,
    intakeNo: intake.intake_no,
    customerName: intake.customers?.name ?? null,
    projectName: intake.project_name,
    dueDateType: intake.due_date_type as DueDateType | null,
    dueDate: intake.due_date,
    isUrgent: intake.is_urgent,
    siteId: intake.site_id,
    staffName: intake.staff?.name ?? null,
    registeredAt: intake.registered_at,
  }
}

export async function loadQueueUnits(supabase: Client): Promise<QueueUnit[]> {
  const { data, error } = await supabase
    .from('work_units')
    .select(QUEUE_COLUMNS)
    .eq('status', 'ready')
    .is('intakes.deleted_at', null)
  if (error) throw new Error(`受注登録待ちを読めませんでした: ${error.message}`)
  return (data as unknown as QueueRowData[]).map(toQueueUnit)
}

// 1 件（受注登録の画面の上の帯に出す。一覧の行を押して開いたとき）。
// 一覧から外れた後（起票完了など）に開いても帯を出せるよう、状態では絞らず、今の状態も返す。見つからなければ null
export async function loadQueueUnit(
  supabase: Client,
  workUnitId: string
): Promise<{ unit: QueueUnit; status: string } | null> {
  const { data, error } = await supabase
    .from('work_units')
    .select(`status, ${QUEUE_COLUMNS}`)
    .eq('id', workUnitId)
    .is('intakes.deleted_at', null)
    .maybeSingle()
  if (error) throw new Error(`受注登録待ちを読めませんでした: ${error.message}`)
  if (!data) return null
  const row = data as unknown as QueueRowData & { status: string }
  return { unit: toQueueUnit(row), status: row.status }
}

// 営業所のタブ（使っている営業所を、番号の順に）
export async function loadQueueSites(supabase: Client): Promise<QueueSite[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('id, number, code, name')
    .eq('is_active', true)
    .order('number')
  if (error) throw new Error(`営業所を読めませんでした: ${error.message}`)
  return data
}

// 受注登録待ちの件数（サイドメニューの「受注登録」のバッジ・部署ホームのカード）。
// siteId を渡すとその営業所の分だけ、null なら全部の営業所を数える（lib/intake/queue.ts の countScopeSiteId）。
// ビュー work_unit_queue_view は論理削除した受付と起票完了を除いてあるため、状態で絞るだけでよい
export async function countReadyUnits(supabase: Client, siteId: string | null): Promise<number> {
  let query = supabase
    .from('work_unit_queue_view')
    .select('work_unit_id', { count: 'exact', head: true })
    .eq('status', 'ready')
  if (siteId) query = query.eq('site_id', siteId)
  const { count, error } = await query
  if (error) throw new Error(`受注登録待ちの件数を数えられませんでした: ${error.message}`)
  return count ?? 0
}
