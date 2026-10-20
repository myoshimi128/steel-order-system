'use server'

// CAD（S-05）の Server Action（docs/intake/screen-design.md「S-05 CAD」）。
//
//   ・startCadWork  : 作業開始（作業待ち → 作業中。担当を自分にする）
//   ・cancelCadWork : 作業開始の取り消し（作業中 → 作業待ち。担当と開始日時を空にする）
//   ・addCadCsvFiles: ブラウザが Storage に置いた CSV の行を作る（トリガーで受注登録待ちになる）
//   ・removeCadCsv  : CSV を外す（論理削除して、実物を消す。0 件になったら作業中に戻る）
// DB の書き込みは関数（supabase/migrations/20261022100000_add_cad_functions.sql）で行い、
// 状態の確かめ（作業中だけ CSV を入れられる など）と、事務・管理者だけが使えることは関数の中で確かめる。
// ここでは画面から届いた値の形（uuid・置き場所）だけを確かめる。

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { INTAKE_FILES_BUCKET } from '@/lib/intake/constants'
import type { UploadedFile, UploadFailure } from '@/lib/intake/upload-intake-files'
import { createClient } from '@/lib/supabase-server'

export type CadActionResult = { ok: true } | { ok: false; error: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

type Client = Awaited<ReturnType<typeof createClient>>

// DB の関数のエラーを、画面に出す文にする
function toErrorMessage(error: { message: string; code?: string }, fallback: string): string {
  if (error.message.includes('CAD_STATUS_CHANGED')) {
    return 'この加工区分の状態がすでに変わっています（ほかの人が操作した可能性があります）。一覧を読み直しました。'
  }
  // 23505 は一意制約の違反（同じ名前の CSV を、ほかの人とほぼ同時に入れた）
  if (error.code === '23505') return '同じ名前の CSV がほぼ同時に登録されました。もう一度入れてください'
  return `${fallback}: ${error.message}`
}

// Storage の実物を消す。消せなくても画面の操作は成功として扱う（行は論理削除済みのため、画面には出ない）
async function removeObjects(supabase: Client, paths: (string | null)[]) {
  const targets = paths.filter((path): path is string => typeof path === 'string' && path !== '')
  if (targets.length === 0) return
  const { error } = await supabase.storage.from(INTAKE_FILES_BUCKET).remove(targets)
  if (error) console.error(`Storage のファイルを消せませんでした: ${error.message}`)
}

// CAD の一覧を作り直す（共通レイアウトのメニューの件数も変わるため、レイアウトごと）
function revalidateCadPages() {
  revalidatePath('/', 'layout')
}


// ============================================================
// 作業開始・取り消し
// ============================================================
// 作業開始。ほかの人が先に始めていたら startedBy にその人の名前を入れて返す（画面で知らせる）
export async function startCadWork(
  workUnitId: string
): Promise<{ ok: true; startedBy: string | null } | { ok: false; error: string }> {
  if (!isUuid(workUnitId)) return { ok: false, error: '加工区分が正しくありません' }
  const [supabase, user] = await Promise.all([createClient(), getCurrentUser()])
  const { data: assignee, error } = await supabase.rpc('start_cad_work', { p_work_unit_id: workUnitId })
  revalidateCadPages()
  if (error) return { ok: false, error: toErrorMessage(error, '作業を開始できませんでした') }

  if (assignee && assignee !== user?.id) {
    const { data: other } = await supabase.from('users').select('name').eq('id', assignee).maybeSingle()
    return { ok: true, startedBy: other?.name ?? 'ほかの人' }
  }
  return { ok: true, startedBy: null }
}

export async function cancelCadWork(workUnitId: string): Promise<CadActionResult> {
  if (!isUuid(workUnitId)) return { ok: false, error: '加工区分が正しくありません' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('cancel_cad_work', { p_work_unit_id: workUnitId })
  revalidateCadPages()
  if (error) return { ok: false, error: toErrorMessage(error, '作業開始を取り消せませんでした') }
  return { ok: true }
}


// ============================================================
// CSV を入れる・外す
// ============================================================
// ブラウザが Storage に置いた CSV を、1 つずつ加工区分に足す（同じ名前は差し替え）。
// 1 つ目の CSV が入った時点で、トリガーが作業中のアイトレを受注登録待ち（ready）にする。
// 足せなかったファイルは、ここで Storage の実物を消して failures で知らせる
export async function addCadCsvFiles(
  intakeId: string,
  workUnitId: string,
  files: UploadedFile[]
): Promise<{ ok: true; failures: UploadFailure[] } | { ok: false; error: string }> {
  if (!isUuid(intakeId) || !isUuid(workUnitId)) return { ok: false, error: '加工区分が正しくありません' }
  for (const file of files) {
    // 置き場所は「受付の id/ファイルの id.拡張子」の形に限る（ほかの受付の置き場所を指せないように）
    if (!isUuid(file.id) || !file.storagePath.startsWith(`${intakeId}/${file.id}`)) {
      return { ok: false, error: 'ファイルが正しくありません' }
    }
  }

  const supabase = await createClient()
  const failures: UploadFailure[] = []
  const replacedPaths: (string | null)[] = []
  for (const file of files) {
    const { data, error } = await supabase.rpc('add_cad_csv', {
      p_work_unit_id: workUnitId,
      p_file_id: file.id,
      p_original_name: file.originalName,
      p_storage_path: file.storagePath,
      p_mime_type: file.mimeType,
      p_size_bytes: file.sizeBytes,
    })
    if (error) {
      failures.push({ name: file.originalName, error: toErrorMessage(error, 'CSV を登録できませんでした') })
      await removeObjects(supabase, [file.storagePath])
      continue
    }
    replacedPaths.push(data)
  }
  // 差し替えた前の CSV の実物を消す
  await removeObjects(supabase, replacedPaths)

  revalidateCadPages()
  return { ok: true, failures }
}

export async function removeCadCsv(fileId: string): Promise<CadActionResult> {
  if (!isUuid(fileId)) return { ok: false, error: 'ファイルが正しくありません' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('remove_cad_csv', { p_file_id: fileId })
  revalidateCadPages()
  if (error) return { ok: false, error: toErrorMessage(error, 'CSV を外せませんでした') }
  await removeObjects(supabase, [data])
  return { ok: true }
}
