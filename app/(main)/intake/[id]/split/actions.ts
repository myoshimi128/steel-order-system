'use server'

// 振り分け（S-04d）の Server Action（docs/intake/screen-design.md「S-04d 振り分け」）。
//
//   ・addSplitFiles       : パソコンからドロップしたファイル（ブラウザが Storage に置いた後）を枠に足す
//   ・copyOriginalToSlot  : 元データを枠へドラッグした → Storage の中で複製して枠に足す
//   ・removeSplitFile     : 枠からファイルを外す（論理削除して、実物を消す）
//   ・setOriginalSplitDone: 元データの「分割して保存済」の印を付け外しする
//   ・completeSplit       : 振り分け完了（加工区分を作り、元データを論理削除して実物を消す）
// 枠は入れた時点で保存する（「一時保存」のボタンはない）。
// DB の書き込みは関数（20261021100000_add_split_file_functions.sql と complete_split）で行い、
// 受付登録済の受付だけを扱うこと・事務・管理者だけが使えることは関数の中で確かめる。
// Storage の実物の削除は、関数が返した置き場所をここで消す（関数からは Storage を消せないため）。

import { revalidatePath } from 'next/cache'
import { INTAKE_FILES_BUCKET, type WorkUnitKind } from '@/lib/intake/constants'
import type { UploadedFile, UploadFailure } from '@/lib/intake/upload-intake-files'
import { storagePathFor, uploadContentTypeFor } from '@/lib/intake/upload-rules'
import { createClient } from '@/lib/supabase-server'

export type SplitActionResult = { ok: true } | { ok: false; error: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SLOTS: readonly WorkUnitKind[] = ['sakisun', 'aitore']

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

type Client = Awaited<ReturnType<typeof createClient>>

// DB の関数のエラーを、画面に出す文にする
function toErrorMessage(error: { message: string }, fallback: string): string {
  if (error.message.includes('SPLIT_NOT_REGISTERED')) {
    return 'この受付は振り分け待ちではありません（ほかの人が振り分けを完了した可能性があります）。一覧を開き直してください。'
  }
  return `${fallback}: ${error.message}`
}

// Storage の実物を消す。消せなくても画面の操作は成功として扱う（行は論理削除済みのため、画面には出ない）
async function removeObjects(supabase: Client, paths: (string | null)[]) {
  const targets = paths.filter((path): path is string => typeof path === 'string' && path !== '')
  if (targets.length === 0) return
  const { error } = await supabase.storage.from(INTAKE_FILES_BUCKET).remove(targets)
  if (error) console.error(`Storage のファイルを消せませんでした: ${error.message}`)
}

// 振り分けの画面・受付待ち一覧を作り直す（共通レイアウトのメニューの件数も変わるため、レイアウトごと）
function revalidateIntakePages() {
  revalidatePath('/', 'layout')
}


// ============================================================
// 枠にファイルを足す（パソコンからドロップ）
// ============================================================
// ブラウザが Storage に置いたファイルを、1 つずつ枠に足す（同じ名前は差し替え）。
// 足せなかったファイルは、ここで Storage の実物を消して failures で知らせる
export async function addSplitFiles(
  intakeId: string,
  slot: WorkUnitKind,
  files: UploadedFile[]
): Promise<{ ok: true; failures: UploadFailure[] } | { ok: false; error: string }> {
  if (!isUuid(intakeId) || !SLOTS.includes(slot)) return { ok: false, error: '振り分けの枠が正しくありません' }
  for (const file of files) {
    if (!isUuid(file.id) || !file.storagePath.startsWith(`${intakeId}/${file.id}`)) {
      return { ok: false, error: 'ファイルが正しくありません' }
    }
  }

  const supabase = await createClient()
  const failures: UploadFailure[] = []
  const replacedPaths: (string | null)[] = []
  for (const file of files) {
    const { data, error } = await supabase.rpc('add_split_file', {
      p_intake_id: intakeId,
      p_file_id: file.id,
      p_slot: slot,
      p_original_name: file.originalName,
      p_storage_path: file.storagePath,
      p_mime_type: file.mimeType,
      p_size_bytes: file.sizeBytes,
    })
    if (error) {
      failures.push({ name: file.originalName, error: toErrorMessage(error, '枠に入れられませんでした') })
      await removeObjects(supabase, [file.storagePath])
      continue
    }
    replacedPaths.push(data)
  }
  // 差し替えた前のファイルの実物を消す
  await removeObjects(supabase, replacedPaths)

  revalidateIntakePages()
  return { ok: true, failures }
}


// ============================================================
// 元データを枠へ（ドラッグ）
// ============================================================
// 元データを Storage の中で複製して、枠のファイルにする（1 部品ずつの DXF を、そのまま振り分けるとき）。
// 元データは振り分け完了で消えるため、移動ではなく複製にする（同じ元データを両方の枠に入れることもできる）
export async function copyOriginalToSlot(
  intakeId: string,
  originalId: string,
  slot: WorkUnitKind
): Promise<SplitActionResult> {
  if (!isUuid(intakeId) || !isUuid(originalId) || !SLOTS.includes(slot)) {
    return { ok: false, error: '振り分けの枠が正しくありません' }
  }

  const supabase = await createClient()
  const { data: original, error } = await supabase
    .from('intake_files')
    .select('storage_path, original_name, mime_type, size_bytes')
    .eq('id', originalId)
    .eq('intake_id', intakeId)
    .eq('kind', 'original')
    .is('deleted_at', null)
    .maybeSingle()
  if (error) return { ok: false, error: `元データを読めませんでした: ${error.message}` }
  if (!original) return { ok: false, error: '元データが見つかりません' }

  const fileId = crypto.randomUUID()
  const storagePath = storagePathFor(intakeId, fileId, original.original_name)
  const { error: copyError } = await supabase.storage
    .from(INTAKE_FILES_BUCKET)
    .copy(original.storage_path, storagePath)
  if (copyError) return { ok: false, error: `元データを複製できませんでした: ${copyError.message}` }

  const { data: replacedPath, error: addError } = await supabase.rpc('add_split_file', {
    p_intake_id: intakeId,
    p_file_id: fileId,
    p_slot: slot,
    p_original_name: original.original_name,
    p_storage_path: storagePath,
    p_mime_type: original.mime_type ?? uploadContentTypeFor(original.original_name),
    p_size_bytes: original.size_bytes ?? 0,
  })
  if (addError) {
    // 行を作れなかったので、複製した実物を消す
    await removeObjects(supabase, [storagePath])
    return { ok: false, error: toErrorMessage(addError, '枠に入れられませんでした') }
  }
  await removeObjects(supabase, [replacedPath])

  revalidateIntakePages()
  return { ok: true }
}


// ============================================================
// 枠から外す・分割して保存済の印
// ============================================================
export async function removeSplitFile(fileId: string): Promise<SplitActionResult> {
  if (!isUuid(fileId)) return { ok: false, error: 'ファイルが正しくありません' }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('remove_split_file', { p_file_id: fileId })
  if (error) return { ok: false, error: toErrorMessage(error, '枠から外せませんでした') }
  await removeObjects(supabase, [data])

  revalidateIntakePages()
  return { ok: true }
}

export async function setOriginalSplitDone(fileId: string, done: boolean): Promise<SplitActionResult> {
  if (!isUuid(fileId)) return { ok: false, error: 'ファイルが正しくありません' }
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_original_split_done', { p_file_id: fileId, p_done: done })
  if (error) return { ok: false, error: toErrorMessage(error, '印を変えられませんでした') }

  revalidateIntakePages()
  return { ok: true }
}


// ============================================================
// 振り分け完了
// ============================================================
// 枠にファイルがある区分ごとに加工区分を作る（先寸 → 受注登録待ち、アイトレ → CAD 作業待ち）。
// withoutDrawings: 図面が 1 つもない注文で、図面なしで作る区分（「図面なしで ○○ として登録」）。
// 元データは関数が論理削除し、返した置き場所の実物をここで消す（置き場所を圧迫しないため）
export async function completeSplit(
  intakeId: string,
  withoutDrawings: WorkUnitKind | null
): Promise<SplitActionResult> {
  if (!isUuid(intakeId) || (withoutDrawings !== null && !SLOTS.includes(withoutDrawings))) {
    return { ok: false, error: '受付が正しくありません' }
  }
  const supabase = await createClient()
  const { data: paths, error } = await supabase.rpc('complete_split', {
    p_intake_id: intakeId,
    p_no_file_kinds: withoutDrawings ? [withoutDrawings] : [],
  })
  if (error) {
    if (error.message.includes('振り分け待ちではありません')) {
      return { ok: false, error: toErrorMessage({ message: 'SPLIT_NOT_REGISTERED' }, '') }
    }
    return { ok: false, error: `振り分けを完了できませんでした: ${error.message}` }
  }
  await removeObjects(supabase, paths ?? [])

  revalidateIntakePages()
  return { ok: true }
}
