'use client'

// 受付の添付ファイルの一覧（メールの中身の「添付ファイル」と、DocumentViewer の「図面データ」で使う）。
//   ・行ごとに形式の印・ファイル名・大きさ。DXF への変換が必要なファイルには「DXF への変換が必要」と出す
//   ・「開く」: PDF は新しいタブで表示し、それ以外（DXF など）はダウンロードする
//     （ダウンロードしたファイルは、パソコンの関連付けで図面ソフトが開く。docs/intake/screen-design.md「DXF を開く」）
//   ・showOpenAll を付けると、上に「すべて図面ソフトで開く」を出す（PDF 以外を順にダウンロードする）

import { Icon } from '@/components/layout/icon'
import { attachmentTypeLabel, formatFileSize, isPdf, needsConversion } from '@/lib/intake/attachments'
import type { IntakeFile } from '@/lib/intake/types'
import { useFileOpener } from '@/lib/intake/use-file-opener'

type IntakeFileListProps = {
  files: readonly IntakeFile[]
  // ファイルがないときの文
  emptyText?: string
  // 上に「すべて図面ソフトで開く」を出すか
  showOpenAll?: boolean
}

export function IntakeFileList({
  files,
  emptyText = '添付ファイルはありません',
  showOpenAll = false,
}: IntakeFileListProps) {
  const opener = useFileOpener()

  if (files.length === 0) return <p className="text-sm text-neutral-500">{emptyText}</p>

  return (
    <div className="flex flex-col gap-2">
      {showOpenAll && (
        <button
          type="button"
          onClick={() => void opener.openAll(files.filter((file) => !isPdf(file.originalName)).map((file) => file.id))}
          disabled={opener.openingId !== null}
          className="flex items-center justify-center gap-2 rounded bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          <Icon name="external" className="h-4 w-4" />
          {opener.openingId === 'all' ? '開いています…' : 'すべて図面ソフトで開く'}
        </button>
      )}
      <ul className="flex flex-col gap-2">
        {files.map((file) => {
          const conversion = needsConversion(file)
          return (
            <li
              key={file.id}
              className={`flex items-center gap-3 rounded border px-3 py-2 text-sm ${
                conversion ? 'border-attention/40 bg-attention-soft/50' : 'border-line'
              }`}
            >
              <span className="w-12 shrink-0 rounded border border-line bg-canvas px-1 py-0.5 text-center text-[11px] font-semibold text-neutral-600">
                {attachmentTypeLabel(file.originalName)}
              </span>
              <span className="min-w-0 flex-1 truncate" title={file.originalName}>
                {file.originalName}
              </span>
              {conversion ? (
                <span className="shrink-0 text-xs font-semibold text-attention">DXF への変換が必要</span>
              ) : (
                <span className="shrink-0 text-xs text-neutral-400">{formatFileSize(file.sizeBytes)}</span>
              )}
              {isPdf(file.originalName) && file.viewUrl ? (
                // PDF はブラウザの中で表示する（新しいタブ）
                <a
                  href={file.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1 rounded border border-line px-2 py-1 text-xs hover:bg-canvas"
                >
                  <Icon name="external" className="h-3.5 w-3.5" />
                  開く
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => void opener.open(file.id)}
                  disabled={opener.openingId === file.id}
                  className="shrink-0 rounded border border-line px-2 py-1 text-xs hover:bg-canvas disabled:opacity-50"
                >
                  {opener.openingId === file.id ? '開いています…' : '開く'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {opener.error && (
        <p role="alert" className="text-xs text-urgent">
          {opener.error}
        </p>
      )}
    </div>
  )
}
