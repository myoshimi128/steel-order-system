'use server'

// 受付待ち一覧・手動で受付を追加・受付登録の Server Action（docs/intake/screen-design.md「S-04a」「S-04b」「S-04c」）。
//
// 書き込みの多くは DB の関数（supabase/migrations/20261020100000_create_intake_registration_functions.sql）で行う。
// 関数は呼び出したユーザーの権限で動き、事務・管理者だけが使える（関数の中と RLS で強制している）。
// そのため、ここではロールを確かめず、画面から届いた値の形（uuid・日付など）だけを確かめる。
//
// ファイルの実体は、ブラウザから Storage に直接置く（lib/intake/upload-intake-files.ts）。
// Server Action には送れる大きさの上限があるため、ファイルは通さない。ここではファイルの行（intake_files）だけを作る。

import { revalidatePath } from 'next/cache'
import { downloadFileName } from '@/lib/intake/file-name'
import {
  INTAKE_FILES_BUCKET,
  type IntakeChannel,
  type IntakeFileKind,
  type WorkUnitKind,
} from '@/lib/intake/constants'
import type { IntakeSavePayload } from '@/lib/intake/intake-form'
import type { Json } from '@/lib/database.types'
import { createClient } from '@/lib/supabase-server'

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string }

// uuid の形か（画面から届いた値を、そのまま DB に渡さないため）
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

// 受付の画面をすべて作り直す（共通レイアウトのメニューの件数も変わるため、レイアウトごと）
function revalidateIntakePages() {
  revalidatePath('/', 'layout')
}

// DB の関数のエラーを、画面に出す文にする
function toErrorMessage(error: { message: string; code?: string }, fallback: string): string {
  if (error.message.includes('INTAKE_NOT_WAITING')) {
    return 'この受付はすでに受付登録されています（ほかの人が先に登録した可能性があります）。一覧を開き直してください。'
  }
  if (error.message.includes('INTAKE_STATUS_CHANGED')) {
    return 'この受付の状態がすでに変わっています。一覧を開き直してください。'
  }
  // 23505 は一意制約の違反（同じ入れ先が 2 つある）
  if (error.code === '23505') return '同じ入れ先が 2 つあります'
  return `${fallback}: ${error.message}`
}


// ============================================================
// 手動で受付を追加（S-04b）
// ============================================================
const MANUAL_CHANNELS: readonly IntakeChannel[] = ['verbal', 'visit', 'mail', 'other']

export type CreateManualIntakeInput = {
  channel: IntakeChannel
  // 受付日時（日本時間の ISO 8601。lib/intake/received-at.ts の toJapanDateTime）
  receivedAt: string
  memo: string
}

// 受付待ちの受付を 1 件作り、その id を返す。
// 作ると、DB のトリガー（intakes_notify_new）がシャーリング部への通知を作る
export async function createManualIntake(
  input: CreateManualIntakeInput
): Promise<ActionResult<{ id: string }>> {
  if (!MANUAL_CHANNELS.includes(input.channel)) return { ok: false, error: '経路が正しくありません' }
  if (Number.isNaN(new Date(input.receivedAt).getTime())) {
    return { ok: false, error: '受付日時が正しくありません' }
  }

  const supabase = await createClient()
  const memo = input.memo.trim()
  const { data, error } = await supabase
    .from('intakes')
    .insert({ channel: input.channel, received_at: input.receivedAt, memo: memo === '' ? null : memo })
    .select('id')
    .single()
  if (error) return { ok: false, error: `受付を追加できませんでした: ${error.message}` }

  revalidateIntakePages()
  return { ok: true, id: data.id }
}

export type RecordIntakeFileInput = {
  // 画面で先に決めたファイルの id（Storage の置き場所にも使っている）
  id: string
  kind: IntakeFileKind
  originalName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
}

// Storage に置いたファイルの行（intake_files）を作る。
// 失敗したら、画面側が Storage の実物を消す（行のないファイルを残さないため）
export async function recordIntakeFiles(
  intakeId: string,
  files: RecordIntakeFileInput[]
): Promise<ActionResult> {
  if (!isUuid(intakeId)) return { ok: false, error: '受付が正しくありません' }
  if (files.length === 0) return { ok: true }
  for (const file of files) {
    // 置き場所は「受付の id/ファイルの id.拡張子」の形に限る（ほかの受付の置き場所を指せないように）
    if (!isUuid(file.id) || !file.storagePath.startsWith(`${intakeId}/${file.id}`)) {
      return { ok: false, error: 'ファイルが正しくありません' }
    }
    if (file.kind !== 'order_pdf' && file.kind !== 'original') {
      return { ok: false, error: 'ファイルの種類が正しくありません' }
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('intake_files').insert(
    files.map((file) => ({
      id: file.id,
      intake_id: intakeId,
      kind: file.kind,
      original_name: file.originalName,
      storage_path: file.storagePath,
      mime_type: file.mimeType,
      size_bytes: file.sizeBytes,
    }))
  )
  if (error) return { ok: false, error: `ファイルを登録できませんでした: ${error.message}` }

  revalidateIntakePages()
  return { ok: true }
}


// ============================================================
// 受付登録・変更・削除（S-04c）
// ============================================================
// 保存する値の形を確かめる（中身の正しさ＝マスタにあるかなどは、外部キーと DB の制約が確かめる）
function isValidPayload(payload: IntakeSavePayload): boolean {
  return (
    DATE_PATTERN.test(payload.intakeDate) &&
    isUuid(payload.staffId) &&
    isUuid(payload.customerId) &&
    isUuid(payload.deliveryMethodId) &&
    isUuid(payload.siteId) &&
    (payload.dueDate === null || DATE_PATTERN.test(payload.dueDate)) &&
    payload.destinationIds.length > 0 &&
    payload.destinationIds.every((id) => id === null || isUuid(id))
  )
}

// 受注情報を保存する。register = true なら受付登録（受付No. の採番）まで行う。受付No. を返す
export async function saveIntake(
  intakeId: string,
  payload: IntakeSavePayload,
  register: boolean
): Promise<ActionResult<{ intakeNo: string }>> {
  if (!isUuid(intakeId) || !isValidPayload(payload)) {
    return { ok: false, error: '入力の内容が正しくありません' }
  }

  const supabase = await createClient()
  // DB の列名に合わせた形にする（関数 save_intake の p_info）
  const info = {
    intake_date: payload.intakeDate,
    staff_id: payload.staffId,
    customer_id: payload.customerId,
    customer_contact: payload.customerContact,
    project_name: payload.projectName,
    due_date_type: payload.dueDateType,
    due_date: payload.dueDate,
    delivery_method_id: payload.deliveryMethodId,
    delivery_method_note: payload.deliveryMethodNote,
    site_id: payload.siteId,
    is_urgent: payload.isUrgent,
  }
  const { data, error } = await supabase.rpc('save_intake', {
    p_intake_id: intakeId,
    p_info: info as Json,
    p_destinations: payload.destinationIds as Json,
    p_register: register,
  })
  if (error) return { ok: false, error: toErrorMessage(error, '保存できませんでした') }

  revalidateIntakePages()
  return { ok: true, intakeNo: data }
}

// 受付を削除する（処理区分 2 削除。論理削除）
export async function deleteIntake(intakeId: string): Promise<ActionResult> {
  if (!isUuid(intakeId)) return { ok: false, error: '受付が正しくありません' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('delete_intake', { p_intake_id: intakeId })
  if (error) return { ok: false, error: toErrorMessage(error, '削除できませんでした') }

  revalidateIntakePages()
  return { ok: true }
}


// ============================================================
// 見積・ミルシート／対象外への区分（S-04a）
// ============================================================
export type ClassifyStatus = 'estimate' | 'excluded' | 'waiting'

// 区分を変える。見積・ミルシートにしたときは、採番した受付No. を返す
export async function classifyIntake(
  intakeId: string,
  status: ClassifyStatus
): Promise<ActionResult<{ intakeNo: string | null }>> {
  if (!isUuid(intakeId) || !['estimate', 'excluded', 'waiting'].includes(status)) {
    return { ok: false, error: '受付が正しくありません' }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('classify_intake', { p_intake_id: intakeId, p_status: status })
  if (error) return { ok: false, error: toErrorMessage(error, '区分を変えられませんでした') }

  revalidateIntakePages()
  return { ok: true, intakeNo: data ?? null }
}


// ============================================================
// 対応中の表示（S-04a・S-04c）
// ============================================================
// 受付待ちの受付を開いたら、自分を対応中にする。
// 戻り値はその後の対応中の人（自分か、30 分以内に開いたほかの人）。受付待ちでなければ null
export async function claimIntake(
  intakeId: string
): Promise<ActionResult<{ handlingBy: string | null; handlingByName: string | null }>> {
  if (!isUuid(intakeId)) return { ok: false, error: '受付が正しくありません' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('claim_intake', { p_intake_id: intakeId })
  if (error) return { ok: false, error: toErrorMessage(error, '対応中にできませんでした') }

  const handlingBy = data ?? null
  let handlingByName: string | null = null
  if (handlingBy) {
    const { data: user } = await supabase.from('users').select('name').eq('id', handlingBy).maybeSingle()
    handlingByName = user?.name ?? null
  }
  return { ok: true, handlingBy, handlingByName }
}

// 対応中を外す（ほかの行に移った・画面を閉じたとき）。失敗しても 30 分で無効になるため、結果は返さない
export async function releaseIntake(intakeId: string): Promise<void> {
  if (!isUuid(intakeId)) return
  const supabase = await createClient()
  const { error } = await supabase.rpc('release_intake', { p_intake_id: intakeId })
  if (error) console.error(`対応中を外せませんでした: ${error.message}`)
}


// ============================================================
// ファイルを開く（DocumentViewer の「開く」）
// ============================================================
// ダウンロード用の期限つきの URL を作る（docs/intake/screen-design.md「DXF を開く」）。
// download にファイル名を渡すと、ブラウザが保存する名前が「受付No._区分_元の名前」になる
const DOWNLOAD_URL_EXPIRES_IN = 60

export async function createIntakeFileDownloadUrl(fileId: string): Promise<ActionResult<{ url: string }>> {
  if (!isUuid(fileId)) return { ok: false, error: 'ファイルが正しくありません' }
  const supabase = await createClient()
  const { data: file, error } = await supabase
    .from('intake_files')
    .select('storage_path, original_name, slot, intakes(intake_no)')
    .eq('id', fileId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) return { ok: false, error: `ファイルを読めませんでした: ${error.message}` }
  if (!file) return { ok: false, error: 'ファイルが見つかりません' }

  const name = downloadFileName(
    file.intakes?.intake_no ?? null,
    file.slot as WorkUnitKind | null,
    file.original_name
  )
  const { data, error: urlError } = await supabase.storage
    .from(INTAKE_FILES_BUCKET)
    .createSignedUrl(file.storage_path, DOWNLOAD_URL_EXPIRES_IN, { download: name })
  if (urlError) return { ok: false, error: `ファイルを開けませんでした: ${urlError.message}` }
  return { ok: true, url: data.signedUrl }
}

// 「すべて開く」用に、複数のファイルのダウンロード用の URL をまとめて作る（順番は渡した id の順）。
// 作れなかったファイルは飛ばす（開けるものだけ開く）
const DOWNLOAD_ALL_LIMIT = 50

export async function createIntakeFileDownloadUrls(fileIds: string[]): Promise<ActionResult<{ urls: string[] }>> {
  if (fileIds.length > DOWNLOAD_ALL_LIMIT || !fileIds.every(isUuid)) {
    return { ok: false, error: 'ファイルが正しくありません' }
  }
  const results = await Promise.all(fileIds.map((id) => createIntakeFileDownloadUrl(id)))
  const urls = results.flatMap((result) => (result.ok ? [result.url] : []))
  if (urls.length === 0 && fileIds.length > 0) return { ok: false, error: 'ファイルを開けませんでした' }
  return { ok: true, urls }
}
