// 受付待ち一覧・受付登録の画面で使う受付を、サーバー（Server Component）で読む。
//
// 受付のテーブルは RLS で事務・管理者だけが読める。現場のユーザーが呼んでも 0 件になる。
// 論理削除した受付（deleted_at が入っている）と、論理削除したファイルは出さない。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { DueDateType } from '@/lib/order-entry/constants'
import { isPdf } from './attachments'
import { INTAKE_FILES_BUCKET, type IntakeChannel, type IntakeFileKind, type IntakeStatus, type WorkUnitKind } from './constants'
import type { IntakeTab } from './tabs'
import type { IntakeDetail, IntakeFile, IntakeListRow } from './types'

type Client = SupabaseClient<Database>

// 一覧に出す件数の上限（見積・対象外は増えていくため、新しいものから区切る）
export const INTAKE_LIST_LIMIT = 200

// 注文書の PDF を画面に出す URL の有効期限（秒）。画面を開いている間に切れないよう 1 時間にする
const VIEW_URL_EXPIRES_IN = 60 * 60

// 一覧・受付登録の両方で読む列。
// customers(name) などは、外部キーをたどって名前を一緒に取る書き方。
// users は受付から何本も外部キーがある（担当者・登録者・対応中の人など）ため、
// handler:users!intakes_handling_by_fkey(name) のように「どの外部キーでたどるか」と別名を付ける
const LIST_COLUMNS = `
  id, intake_no, channel, status, received_at, email_from, email_subject, email_body, memo,
  project_name, due_date_type, due_date, is_urgent, handling_by, handling_at,
  customers(name), sites(name), handler:users!intakes_handling_by_fkey(name),
  intake_files(id, kind, slot, original_name, size_bytes, storage_path, deleted_at)
`

const DETAIL_COLUMNS = `${LIST_COLUMNS},
  intake_date, staff_id, customer_id, customer_contact, delivery_method_id, delivery_method_note, site_id,
  intake_destinations(seq, destination_id)
`

// 読んだ行の形（select の文字列から型を推論させると長くなるため、使う列だけを書いた型で受ける）
type FileRow = {
  id: string
  kind: string
  slot: string | null
  original_name: string
  size_bytes: number | null
  storage_path: string
  deleted_at: string | null
}

type ListRowData = {
  id: string
  intake_no: string | null
  channel: string
  status: string
  received_at: string
  email_from: string | null
  email_subject: string | null
  email_body: string | null
  memo: string | null
  project_name: string | null
  due_date_type: string | null
  due_date: string | null
  is_urgent: boolean
  handling_by: string | null
  handling_at: string | null
  customers: { name: string } | null
  sites: { name: string } | null
  handler: { name: string } | null
  intake_files: FileRow[]
}

type DetailRowData = ListRowData & {
  intake_date: string | null
  staff_id: string | null
  customer_id: string | null
  customer_contact: string | null
  delivery_method_id: string | null
  delivery_method_note: string | null
  site_id: string | null
  intake_destinations: { seq: number; destination_id: string | null }[]
}

// DB の text 列（check 制約で値を限定）は、生成された型では string のため、ここで画面の型に合わせる
function toFile(row: FileRow, viewUrls: Map<string, string>): IntakeFile {
  return {
    id: row.id,
    kind: row.kind as IntakeFileKind,
    slot: row.slot as WorkUnitKind | null,
    originalName: row.original_name,
    sizeBytes: row.size_bytes,
    viewUrl: viewUrls.get(row.storage_path) ?? null,
  }
}

function toListRow(row: ListRowData, viewUrls: Map<string, string>): IntakeListRow {
  return {
    id: row.id,
    intakeNo: row.intake_no,
    channel: row.channel as IntakeChannel,
    status: row.status as IntakeStatus,
    receivedAt: row.received_at,
    emailFrom: row.email_from,
    emailSubject: row.email_subject,
    emailBody: row.email_body,
    memo: row.memo,
    customerName: row.customers?.name ?? null,
    projectName: row.project_name,
    dueDateType: row.due_date_type as DueDateType | null,
    dueDate: row.due_date,
    isUrgent: row.is_urgent,
    siteName: row.sites?.name ?? null,
    handlingBy: row.handling_by,
    handlingByName: row.handler?.name ?? null,
    handlingAt: row.handling_at,
    files: row.intake_files
      .filter((file) => file.deleted_at === null)
      // 注文書を先に、その後はファイル名の順
      .sort((a, b) =>
        a.kind === b.kind
          ? a.original_name.localeCompare(b.original_name, 'ja')
          : a.kind === 'order_pdf'
            ? -1
            : b.kind === 'order_pdf'
              ? 1
              : 0
      )
      .map((file) => toFile(file, viewUrls)),
  }
}

// 注文書の PDF に、画面に埋め込むための期限つきの URL（署名付き URL）を作る。
// バケットは非公開のため、URL を知っていても期限が切れたら開けない。
// 置き場所（storage_path）→ URL の対応を返す
async function createViewUrls(supabase: Client, files: FileRow[]): Promise<Map<string, string>> {
  const paths = files
    .filter((file) => file.deleted_at === null && isPdf(file.original_name))
    .map((file) => file.storage_path)
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls

  const { data, error } = await supabase.storage
    .from(INTAKE_FILES_BUCKET)
    .createSignedUrls(paths, VIEW_URL_EXPIRES_IN)
  if (error) {
    // URL を作れなくても一覧は出す（PDF の欄に「表示できません」と出る）
    console.error(`注文書の URL を作れませんでした: ${error.message}`)
    return urls
  }
  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
  }
  return urls
}

// タブの一覧（新しい順）
export async function loadIntakeList(supabase: Client, tab: IntakeTab): Promise<IntakeListRow[]> {
  const { data, error } = await supabase
    .from('intakes')
    .select(LIST_COLUMNS)
    .eq('status', tab)
    .is('deleted_at', null)
    .order('received_at', { ascending: false })
    .limit(INTAKE_LIST_LIMIT)
  if (error) throw new Error(`受付を読めませんでした: ${error.message}`)

  const rows = data as unknown as ListRowData[]
  const viewUrls = await createViewUrls(
    supabase,
    rows.flatMap((row) => row.intake_files)
  )
  return rows.map((row) => toListRow(row, viewUrls))
}

// 状態ごとの件数（受付待ち・受付登録済のタブの件数と、サイドメニューのバッジに使う）。
// head: true は「行は返さず、件数だけを数える」指定
export async function countIntakes(supabase: Client, status: IntakeStatus): Promise<number> {
  const { count, error } = await supabase
    .from('intakes')
    .select('id', { count: 'exact', head: true })
    .eq('status', status)
    .is('deleted_at', null)
  if (error) throw new Error(`受付の件数を数えられませんでした: ${error.message}`)
  return count ?? 0
}

// 自分がまだ読んでいない通知のある受付の id（一覧の NEW の印に使う）。
// 未読 = 自分の部署の通知のうち、自分の既読（notification_reads）がないもの（lib/notifications/queries.ts と同じ書き方）
export async function loadUnreadIntakeIds(supabase: Client): Promise<string[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('intake_id, notification_reads(notification_id)')
    .is('notification_reads', null)
    .not('intake_id', 'is', null)
    .limit(1000)
  if (error) {
    // NEW の印が出ないだけなので、一覧は出す
    console.error(`未読の通知を読めませんでした: ${error.message}`)
    return []
  }
  return [...new Set(data.map((row) => row.intake_id).filter((id): id is string => id !== null))]
}

function toDetail(row: DetailRowData, viewUrls: Map<string, string>): IntakeDetail {
  return {
    ...toListRow(row, viewUrls),
    info: {
      intakeDate: row.intake_date,
      staffId: row.staff_id,
      customerId: row.customer_id,
      customerContact: row.customer_contact,
      projectName: row.project_name,
      dueDateType: row.due_date_type as DueDateType | null,
      dueDate: row.due_date,
      deliveryMethodId: row.delivery_method_id,
      deliveryMethodNote: row.delivery_method_note,
      siteId: row.site_id,
      isUrgent: row.is_urgent,
      destinationIds: [...row.intake_destinations]
        .sort((a, b) => a.seq - b.seq)
        .map((destination) => destination.destination_id),
    },
  }
}

// 受付 1 件（受付登録の画面）。id か受付No. で探す。見つからなければ null
export async function loadIntakeDetail(
  supabase: Client,
  key: { id: string } | { intakeNo: string }
): Promise<IntakeDetail | null> {
  let query = supabase.from('intakes').select(DETAIL_COLUMNS).is('deleted_at', null)
  query = 'id' in key ? query.eq('id', key.id) : query.eq('intake_no', key.intakeNo)
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(`受付を読めませんでした: ${error.message}`)
  if (!data) return null

  const row = data as unknown as DetailRowData
  const viewUrls = await createViewUrls(supabase, row.intake_files)
  return toDetail(row, viewUrls)
}
