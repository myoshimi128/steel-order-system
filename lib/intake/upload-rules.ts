// 受付にファイルを入れるときの決まり（docs/intake/table-design.md「ファイルの保存」）。
//
//   ・入れられるのは PDF と DXF だけ（手動で受付を追加の「注文書（PDF・DXF）」）
//   ・1 ファイル 50MB まで（Storage のバケットの上限と同じ。未決事項 Q-4）
//   ・PDF は注文書（order_pdf）、DXF は元データ（original。振り分けで先寸・アイトレに分ける）として保存する
//   ・Storage の置き場所は {受付の id}/{ファイルの id}.{拡張子}。日本語のファイル名は置き場所に使わず、
//     元の名前は intake_files.original_name に残す
//
// 置く順番は「Storage に置く → 成功したら intake_files の行を作る → 行を作れなかったら Storage から消す」
// （lib/intake/upload-intake-files.ts）。ファイルの id は画面で先に決める。

import { fileExtension, isDxf, isPdf } from './attachments'
import type { IntakeFileKind } from './constants'

// 1 ファイルの上限（バイト）。52428800 = 50MB
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

// ファイルを選ぶ画面で、選べる種類を絞る（<input type="file" accept=...>）
export const UPLOAD_ACCEPT = '.pdf,.dxf,application/pdf'

type UploadCandidate = { name: string; size: number }

// 入れられないファイルの理由。入れられるなら null
export function uploadRejectionReason(file: UploadCandidate): string | null {
  if (!isPdf(file.name) && !isDxf(file.name)) {
    return 'PDF か DXF のファイルを入れてください'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return '1 ファイル 50MB までです'
  }
  if (file.size === 0) {
    return '中身が空のファイルです'
  }
  return null
}

// 保存するときのファイルの種類（PDF は注文書、DXF は元データ）
export function uploadKindFor(name: string): IntakeFileKind {
  return isPdf(name) ? 'order_pdf' : 'original'
}

// Storage に置くときのファイルの種類（Content-Type）。
// PDF に application/pdf を付けると、署名付き URL を開いたときにブラウザの中で表示される
// （付けないと、ダウンロードになることがある）
export function uploadContentTypeFor(name: string): string {
  return isPdf(name) ? 'application/pdf' : 'application/octet-stream'
}

// Storage の置き場所 {受付の id}/{ファイルの id}.{拡張子}
export function storagePathFor(intakeId: string, fileId: string, name: string): string {
  const ext = fileExtension(name)
  return ext === '' ? `${intakeId}/${fileId}` : `${intakeId}/${fileId}.${ext}`
}
