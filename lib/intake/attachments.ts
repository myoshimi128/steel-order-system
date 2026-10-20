// 受付の添付ファイルの種類の判定（docs/intake/screen-design.md「S-04a 受付待ち一覧」の列「添付」）。
//
// 一覧の「PDF ／ DXF n ／ 要変換 n」と、メールの中身の添付の一覧に使う。
//   ・PDF   : 拡張子が .pdf のファイル（注文書など）
//   ・DXF   : 拡張子が .dxf のファイル（図面データ）
//   ・要変換: 元データ（kind = 'original'）のうち DXF でないもの。社内で開けない形式の図面のため、
//             DXF に変換してから振り分けの枠に入れる（docs/intake/basic-design.md「例外の運用」）
// 拡張子の一覧（どの形式が図面か）は持たない。「元データなのに DXF でない」ことで判定する。

import type { IntakeFileKind } from './constants'

export type AttachmentFile = {
  kind: IntakeFileKind
  originalName: string
}

// ファイル名の拡張子（小文字。点は含めない）。拡張子がなければ空文字
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  // 先頭の点（.gitignore のような名前）と、点で終わる名前は拡張子なしとみなす
  if (dot <= 0 || dot === name.length - 1) return ''
  return name.slice(dot + 1).toLowerCase()
}

export function isPdf(name: string): boolean {
  return fileExtension(name) === 'pdf'
}

export function isDxf(name: string): boolean {
  return fileExtension(name) === 'dxf'
}

// CAD で部品を作った後に出力する CSV（CAD の画面で受け付ける）
export function isCsv(name: string): boolean {
  return fileExtension(name) === 'csv'
}

// DXF への変換が必要なファイルか
export function needsConversion(file: AttachmentFile): boolean {
  return file.kind === 'original' && !isDxf(file.originalName)
}

// 一覧の印に出す形式の名前（PDF・DXF・それ以外は拡張子の大文字。拡張子がなければ「ファイル」）
export function attachmentTypeLabel(name: string): string {
  const ext = fileExtension(name)
  return ext === '' ? 'ファイル' : ext.toUpperCase()
}

export type AttachmentSummary = {
  pdf: number
  dxf: number
  // 要変換の数
  conversion: number
  // どれにも当たらないもの（CSV など）
  other: number
}

// 添付の数を種類ごとに数える（一覧の列「添付」に出す）
export function summarizeAttachments(files: readonly AttachmentFile[]): AttachmentSummary {
  const summary: AttachmentSummary = { pdf: 0, dxf: 0, conversion: 0, other: 0 }
  for (const file of files) {
    if (isPdf(file.originalName)) summary.pdf += 1
    else if (isDxf(file.originalName)) summary.dxf += 1
    else if (needsConversion(file)) summary.conversion += 1
    else summary.other += 1
  }
  return summary
}

// ファイルの大きさを「320KB」「1.2MB」の形にする
export function formatFileSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}
