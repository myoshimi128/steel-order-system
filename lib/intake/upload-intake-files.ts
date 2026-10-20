// 受付のファイルを Storage に置く（ブラウザで動かす）。docs/intake/table-design.md「ファイルの保存」。
//
// 置く順番:
//   1. ファイルの id を画面で決める（crypto.randomUUID）
//   2. Storage の intake-files バケットの {受付の id}/{ファイルの id}.{拡張子} に置く（ブラウザから直接）
//   3. 置けたファイルの行（intake_files）を作る（Server Action）
//   4. 3 に失敗したら、2 で置いた実物を Storage から消す（行のない実物を残さないため）
// 先に行を作ってから置く順だと、置くのに失敗したときに行を消す必要があるが、
// intake_files には削除の権限を付けていない（業務データは物理削除しない）ため、この順にしている。
//
// ブラウザから直接置くのは、Server Action には送れる大きさの上限があり、図面のファイルが通らないことがあるため。
// 置けるのは事務・管理者だけ（Storage のポリシーで強制している）。
//
// 行の作り方は使う画面で違うため、3 は呼び出す側から関数（record）で受け取る。
//   ・手動で受付を追加: 注文書・元データの行をまとめて作る（recordIntakeFiles）
//   ・振り分けの枠    : 枠のファイルの行を作る（addSplitFiles。同じ名前は差し替え）

import { recordIntakeFiles, type RecordIntakeFileInput } from '@/app/(main)/intake/actions'
import { createClient } from '@/lib/supabase-browser'
import { INTAKE_FILES_BUCKET } from './constants'
import { storagePathFor, uploadContentTypeFor, uploadKindFor } from './upload-rules'

export type UploadFailure = { name: string; error: string }

export type UploadResult = {
  // 置けなかったファイルの名前と理由
  failures: UploadFailure[]
}

// Storage に置いたファイル（行を作る前）
export type UploadedFile = RecordIntakeFileInput

// 行を作る関数。全部失敗なら ok: false と理由（置いた実物はここで消す）。
// 1 ファイルずつ行を作る場合（振り分けの枠）は、作れなかったファイルの実物を呼び出した側（サーバー）で消し、
// failures で知らせる
type RecordFiles = (
  files: UploadedFile[]
) => Promise<{ ok: true; failures?: UploadFailure[] } | { ok: false; error: string }>

// ファイルを Storage に置いてから、record で行を作る。行を作れなかったら置いた実物を消す
export async function uploadFilesWith(
  intakeId: string,
  files: readonly File[],
  record: RecordFiles
): Promise<UploadResult> {
  if (files.length === 0) return { failures: [] }

  const supabase = createClient()
  const bucket = supabase.storage.from(INTAKE_FILES_BUCKET)
  const failures: UploadFailure[] = []
  const uploaded: UploadedFile[] = []

  // 1 ファイルずつ置く（大きなファイルを同時に送って、回線を詰まらせないため）
  for (const file of files) {
    const id = crypto.randomUUID()
    const storagePath = storagePathFor(intakeId, id, file.name)
    const contentType = uploadContentTypeFor(file.name)
    // upsert: false で、同じ置き場所にすでにファイルがあれば上書きせずにエラーにする（id は毎回新しいので、通常は起きない）
    const { error } = await bucket.upload(storagePath, file, { contentType, upsert: false })
    if (error) {
      failures.push({ name: file.name, error: error.message })
      continue
    }
    uploaded.push({
      id,
      kind: uploadKindFor(file.name),
      originalName: file.name,
      storagePath,
      mimeType: contentType,
      sizeBytes: file.size,
    })
  }

  if (uploaded.length === 0) return { failures }

  const result = await record(uploaded)
  if (!result.ok) {
    // 行を作れなかったので、置いた実物を消す。消すのに失敗しても、画面にはエラーを出すだけにする
    const { error } = await bucket.remove(uploaded.map((file) => file.storagePath))
    if (error) console.error(`置いたファイルを消せませんでした: ${error.message}`)
    for (const file of uploaded) failures.push({ name: file.originalName, error: result.error })
    return { failures }
  }
  failures.push(...(result.failures ?? []))
  return { failures }
}

// 手動で受付を追加: 注文書（PDF）・元データ（DXF）として行を作る
export function uploadIntakeFiles(intakeId: string, files: readonly File[]): Promise<UploadResult> {
  return uploadFilesWith(intakeId, files, (uploaded) => recordIntakeFiles(intakeId, uploaded))
}
