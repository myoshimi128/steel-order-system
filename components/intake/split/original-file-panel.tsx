'use client'

// 振り分けの左側: 元データ（メールの添付など）の一覧（画面イメージ 04d の左）。
//   ・上に「すべて図面ソフトで開く」
//   ・行ごとに: 形式の印・ファイル名・状態（→先寸／→アイトレ／分割して保存済／未振り分け）・「開く」
//   ・枠に同じ名前のファイルがない行は、「分割して保存済」の印を付け外しできる
//     （複数の部品が入った DXF を、図面ソフトで分けて別の名前で保存したとき）
//   ・行を右の枠へドラッグすると、その元データを複製して枠に入れる（1 部品ずつの DXF）
//   ・下に操作の案内
// 元データは振り分け完了で消える（見返したいときは、受付のメールの添付から確認する）。

import { Icon } from '@/components/layout/icon'
import { Panel } from '@/components/layout/panel'
import { attachmentTypeLabel, needsConversion } from '@/lib/intake/attachments'
import { originalStateLabel, originalStateOf } from '@/lib/intake/split'
import { useFileOpener } from '@/lib/intake/use-file-opener'
import { ORIGINAL_DRAG_TYPE, type SplitBoard } from '@/lib/intake/use-split-board'

// 状態ごとの印の見た目（アイトレだけ塗りつぶしにして、先寸と見分けやすくする。画面イメージ 04d と同じ）
function stateClass(kind: 'assigned-sakisun' | 'assigned-aitore' | 'splitDone' | 'unassigned'): string {
  switch (kind) {
    case 'assigned-sakisun':
      return 'border border-navy text-navy'
    case 'assigned-aitore':
      return 'bg-navy text-white'
    case 'splitDone':
      return 'border border-line bg-canvas text-neutral-600'
    case 'unassigned':
      return 'font-bold text-urgent'
  }
}

export function OriginalFilePanel({ board }: { board: SplitBoard }) {
  const opener = useFileOpener()
  const drawingIds = board.originals.map((file) => file.id)

  return (
    <Panel title="元データ（メール添付）" aside={<span className="text-xs text-neutral-500">振り分け完了で自動で削除します</span>} className="min-h-0">
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        {board.originals.length > 0 && (
          <button
            type="button"
            onClick={() => void opener.openAll(drawingIds)}
            disabled={opener.openingId !== null}
            className="flex items-center justify-center gap-2 rounded bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-hover disabled:opacity-60"
          >
            <Icon name="external" className="h-4 w-4" />
            {opener.openingId === 'all' ? '開いています…' : 'すべて図面ソフトで開く'}
          </button>
        )}

        <ul className="min-h-0 flex-1 overflow-y-auto">
          {board.originals.map((file) => {
            const state = originalStateOf(file, board.slotFiles)
            const styleKind =
              state.kind === 'assigned'
                ? state.slots.includes('aitore') && !state.slots.includes('sakisun')
                  ? 'assigned-aitore'
                  : 'assigned-sakisun'
                : state.kind
            return (
              <li
                key={file.id}
                // 行を右の枠へドラッグできる。ドラッグの中身に元データの id を入れる
                draggable={!board.busy}
                onDragStart={(event) => {
                  event.dataTransfer.setData(ORIGINAL_DRAG_TYPE, file.id)
                  event.dataTransfer.effectAllowed = 'copy'
                }}
                className="flex cursor-grab items-center gap-3 border-b border-line py-2.5 text-sm active:cursor-grabbing"
              >
                <span className="w-11 shrink-0 rounded border border-line bg-canvas px-1 py-0.5 text-center text-[10px] font-semibold text-neutral-600">
                  {attachmentTypeLabel(file.originalName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate" title={file.originalName}>
                    {file.originalName}
                  </span>
                  {needsConversion(file) && (
                    <span className="text-xs font-semibold text-attention">DXF への変換が必要</span>
                  )}
                </span>
                {state.kind !== 'assigned' && (
                  <label className="flex shrink-0 items-center gap-1 text-xs text-neutral-600">
                    <input
                      type="checkbox"
                      checked={file.splitDone}
                      disabled={board.busy}
                      onChange={(event) => void board.toggleSplitDone(file.id, event.target.checked)}
                    />
                    分割して保存済
                  </label>
                )}
                <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${stateClass(styleKind)}`}>
                  {originalStateLabel(state)}
                </span>
                <button
                  type="button"
                  onClick={() => void opener.open(file.id)}
                  disabled={opener.openingId !== null}
                  className="shrink-0 rounded border border-line px-2.5 py-1 text-xs font-semibold hover:bg-canvas disabled:opacity-50"
                >
                  {opener.openingId === file.id ? '開いています…' : '開く'}
                </button>
              </li>
            )
          })}
        </ul>
        {board.originals.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-500">
            元データはありません。図面がない注文は、右下の「図面なしで登録」で振り分けを完了します。
          </p>
        )}
        {opener.error && (
          <p role="alert" className="text-xs text-urgent">
            {opener.error}
          </p>
        )}

        <ul className="list-disc rounded bg-canvas px-6 py-3 text-xs leading-6 text-neutral-600">
          <li>1 つの DXF に複数の部品 → 図面ソフトで先寸／アイトレの部品だけ残して「名前を付けて保存」し、右の枠へ。終わったら「分割して保存済」にチェック</li>
          <li>1 部品ずつの DXF → この一覧の行を、そのまま右の枠へドラッグ</li>
          <li>DXF への変換が必要なファイルは、DXF に変換してから枠へ</li>
        </ul>
      </div>
    </Panel>
  )
}
