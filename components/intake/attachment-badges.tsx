// 受付の添付の印（一覧の列「添付」。画面イメージ 04a の「PDF」「DXF 10」「○○ 2（要変換）」の形）。
//   PDF の数 ／ DXF の数 ／ 要変換の数（元データのうち DXF でないもの）。添付がなければ「なし」

import { summarizeAttachments, type AttachmentFile } from '@/lib/intake/attachments'

function Badge({ children, warn = false }: { children: string; warn?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded border px-1.5 py-0.5 text-[11px] font-semibold ${
        warn ? 'border-attention/40 bg-attention-soft text-attention' : 'border-line bg-canvas text-neutral-600'
      }`}
    >
      {children}
    </span>
  )
}

export function AttachmentBadges({ files }: { files: readonly AttachmentFile[] }) {
  if (files.length === 0) return <span className="text-xs text-neutral-400">なし</span>
  const summary = summarizeAttachments(files)
  return (
    <span className="flex flex-wrap gap-1">
      {summary.pdf > 0 && <Badge>{summary.pdf === 1 ? 'PDF' : `PDF ${summary.pdf}`}</Badge>}
      {summary.dxf > 0 && <Badge>{`DXF ${summary.dxf}`}</Badge>}
      {summary.conversion > 0 && <Badge warn>{`要変換 ${summary.conversion}`}</Badge>}
      {summary.other > 0 && <Badge>{`ほか ${summary.other}`}</Badge>}
    </span>
  )
}
