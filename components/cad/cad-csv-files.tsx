'use client'

// 登録した CAD の CSV の一覧（右のパネルの CSV の枠の上）。
// 行ごとに「開く」（ダウンロード）と ×（外す）。外すときは確認のダイアログを出す（担当以外の人も外せる）。
// CSV が 0 件になると、その加工区分は作業中に戻る（受注登録待ちから外れる）。

import { Icon } from '@/components/layout/icon'
import { formatFileSize } from '@/lib/intake/attachments'
import type { CadUnit } from '@/lib/intake/types'
import type { CadBoard } from '@/lib/intake/use-cad-board'
import { useFileOpener } from '@/lib/intake/use-file-opener'

export function CadCsvFiles({ unit, board }: { unit: CadUnit; board: CadBoard }) {
  const opener = useFileOpener()
  const busy = board.busyUnitId === unit.id

  if (unit.csvFiles.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1.5">
        {unit.csvFiles.map((file) => (
          <li key={file.id} className="flex items-center gap-2 rounded border border-line px-3 py-2 text-sm">
            <span className="w-10 shrink-0 rounded border border-line bg-canvas px-1 py-0.5 text-center text-[11px] font-semibold text-neutral-600">
              CSV
            </span>
            <span className="min-w-0 flex-1 truncate" title={file.originalName}>
              {file.originalName}
            </span>
            <span className="shrink-0 text-xs text-neutral-400">{formatFileSize(file.sizeBytes)}</span>
            <button
              type="button"
              onClick={() => void opener.open(file.id)}
              disabled={opener.openingId !== null}
              className="shrink-0 rounded border border-line px-2 py-0.5 text-xs hover:bg-canvas disabled:opacity-50"
            >
              開く
            </button>
            <button
              type="button"
              onClick={() => void board.removeCsv(unit, file)}
              disabled={busy}
              className="shrink-0 rounded p-1 text-neutral-400 hover:bg-canvas hover:text-neutral-700 disabled:opacity-50"
            >
              <Icon name="x" className="h-4 w-4" />
              <span className="sr-only">{file.originalName} を外す</span>
            </button>
          </li>
        ))}
      </ul>
      {opener.error && (
        <p role="alert" className="text-xs text-urgent">
          {opener.error}
        </p>
      )}
    </div>
  )
}
