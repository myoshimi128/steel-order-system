// 受付のファイルを Storage に置く（ブラウザで動かす）。docs/intake/table-design.md「ファイルの保存」。
//
// 置く順番:
//   1. ファイルの id を画面で決める（crypto.randomUUID）
//   2. Storage の intake-files バケットの {受付の id}/{ファイルの id}.{拡張子} に置く（ブラウザから直接）
//   3. 置けたファイルの行（intake_files）をまとめて作る（Server Action の recordIntakeFiles）
//   4. 3 に失敗したら、2 で置いた実物を Storage から消す（行のない実物を残さないため）
// 先に行を作ってから置く順だと、置くのに失敗したときに行を消す必要があるが、
// intake_files には削除の権限を付けていない（業務データは物理削除しない）ため、この順にしている。
//
// ブラウザから直接置くのは、Server Action には送れる大きさの上限があり、図面のファイルが通らないことがあるため。
// 置けるのは事務・管理者だけ（Storage のポリシーで強制している）。

import { recordIntakeFiles, type RecordIntakeFileInput } from '@/app/(main)/intake/actions'
import { createClient } from '@/lib/supabase-browser'
import { INTAKE_FILES_BUCKET } from './constants'
import { storagePathFor, uploadContentTypeFor, uploadKindFor } from './upload-rules'

export type UploadResult = {
  // 置けなかったファイルの名前と理由
  failures: { name: string; error: string }[]
}

export async function uploadIntakeFiles(intakeId: string, files: readonly File[]): Promise<UploadResult> {
  if (files.length === 0) return { failures: [] }

  const supabase = createClient()
  const bucket = supabase.storage.from(INTAKE_FILES_BUCKET)
  const failures: UploadResult['failures'] = []
  const uploaded: RecordIntakeFileInput[] = []

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

  const result = await recordIntakeFiles(intakeId, uploaded)
  if (!result.ok) {
    // 行を作れなかったので、置いた実物を消す。消すのに失敗しても、画面にはエラーを出すだけにする
    const { error } = await bucket.remove(uploaded.map((file) => file.storagePath))
    if (error) console.error(`置いたファイルを消せませんでした: ${error.message}`)
    for (const file of uploaded) failures.push({ name: file.originalName, error: result.error })
  }
  return { failures }
}
