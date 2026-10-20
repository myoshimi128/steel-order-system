'use client'

// 振り分けの枠 1 つ（先寸 または アイトレ。画面イメージ 04d の右の点線の枠）。
//   ・上に「先寸 3ファイル」、その下に枠のファイル（「開く」と × で外す）
//   ・元データと名前が違うファイル（図面ソフトで分けて保存したもの）には「分割」の印を付ける
//   ・枠のどこにでもドロップできる: パソコンのファイル（PDF・DXF。複数可）、または左の元データの行
//   ・下の「ここにドロップ」を押すと、ファイルを選ぶ画面が開く
// 入れた時点で保存する。同じ名前のファイルを入れると差し替える。

import { useRef, useState, type DragEvent } from 'react'
import { Icon } from '@/components/layout/icon'
import { WORK_UNIT_KIND_LABELS, type WorkUnitKind } from '@/lib/intake/constants'
import { useFileOpener } from '@/lib/intake/use-file-opener'
import { ORIGINAL_DRAG_TYPE, type SplitBoard } from '@/lib/intake/use-split-board'
import { UPLOAD_ACCEPT } from '@/lib/intake/upload-rules'

// 枠ごとの行き先の案内
const DESTINATION: Record<WorkUnitKind, string> = {
  sakisun: '→ 受注登録待ちへ',
  aitore: '→ CAD（部品作成待ち）へ',
}

export function SplitSlot({ slot, board }: { slot: WorkUnitKind; board: SplitBoard }) {
  const opener = useFileOpener()
  const inputRef = useRef<HTMLInputElement>(null)
  // ファイルを枠の上に持ってきている間は、枠の色を変える
  const [dragging, setDragging] = useState(false)

  const files = board.slotFiles.filter((file) => file.slot === slot)
  const originalNames = new Set(board.originals.map((file) => file.originalName))
  const saving = board.busySlot === slot

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    // 既定の動き（ブラウザがファイルを開いてしまう）を止める
    event.preventDefault()
    setDragging(false)
    if (board.busy) return
    const originalId = event.dataTransfer.getData(ORIGINAL_DRAG_TYPE)
    if (originalId) {
      void board.dropOriginal(slot, originalId)
    } else if (event.dataTransfer.files.length > 0) {
      void board.dropFiles(slot, event.dataTransfer.files)
    }
  }

  return (
    <div
      onDragOver={(event) => {
        // dragover の既定の動きを止めないと、drop が起きない
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex min-h-0 flex-col rounded border-2 border-dashed p-4 ${
        dragging ? 'border-navy bg-navy-soft' : slot === 'aitore' ? 'border-navy/70' : 'border-navy/30'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-bold ${
            slot === 'aitore' ? 'bg-navy text-white' : 'border border-navy text-navy'
          }`}
        >
          {WORK_UNIT_KIND_LABELS[slot]}
        </span>
        <span className="text-base font-bold text-navy">{files.length}ファイル</span>
        {saving && <span className="ml-auto text-xs text-neutral-500">保存しています…</span>}
      </div>

      <ul className="mt-3 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {files.map((file) => (
          <li key={file.id} className="flex items-center gap-2 rounded border border-line bg-white px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate" title={file.originalName}>
              {file.originalName}
            </span>
            {!originalNames.has(file.originalName) && (
              <span className="shrink-0 rounded bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-neutral-600">
                分割
              </span>
            )}
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
              onClick={() => void board.remove(file.id)}
              disabled={board.busy}
              className="shrink-0 rounded p-1 text-neutral-400 hover:bg-canvas hover:text-neutral-700 disabled:opacity-50"
            >
              <Icon name="x" className="h-4 w-4" />
              <span className="sr-only">{file.originalName} を枠から外す</span>
            </button>
          </li>
        ))}
      </ul>
      {opener.error && (
        <p role="alert" className="mt-2 text-xs text-urgent">
          {opener.error}
        </p>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={board.busy}
        className="mt-3 flex flex-col items-center gap-1 border-t border-dashed border-line pt-4 text-xs text-neutral-500 hover:text-navy disabled:opacity-50"
      >
        <Icon name="upload" className="h-5 w-5" />
        ここにドロップ（複数可）
        <span>{DESTINATION[slot]}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) void board.dropFiles(slot, event.target.files)
          // 同じファイルをもう一度選んでも onChange が起きるよう、選んだ内容を空に戻す
          event.target.value = ''
        }}
      />
    </div>
  )
}
