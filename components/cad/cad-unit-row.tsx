'use client'

// CAD の一覧の 1 行。
//   ・至急の行は背景を薄い赤にし、納期の上に「至急」の印を出す
//   ・作業中の行は、担当の下に作業を始めてからの経過時間を出す。
//     CAD_LONG_RUNNING_HOURS（lib/intake/constants.ts）以上たった行は、背景をオレンジ系にして目立たせる
//     （CAD の作業は終わったのに、CSV を入れ忘れて作業中のまま残っていることに気づけるように）
//   ・図面の「DXF」を押すと、この加工区分の図面を開く（2 件以上ならまとめて開く）
//   ・操作: 作業待ちは「作業開始」、作業中は「CSV を登録」（右のパネルの枠と同じ。ファイルを選ぶ画面が開く）
// 行を押すと選び、右のパネルに出す。

import { formatShortDateTime } from '@/lib/lead-time/display'
import { cadStatusLabel, shortDueDateText } from '@/lib/intake/cad'
import { isPdf } from '@/lib/intake/attachments'
import type { CadUnit } from '@/lib/intake/types'
import { CAD_CSV_INPUT_ID, type CadBoard } from '@/lib/intake/use-cad-board'
import { useFileOpener } from '@/lib/intake/use-file-opener'

const SMALL_BUTTON =
  'rounded border border-line bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-canvas disabled:opacity-50'
const PRIMARY_SMALL_BUTTON =
  'rounded bg-navy px-2.5 py-1.5 text-xs font-bold text-white hover:bg-navy-hover disabled:opacity-60'

export function CadUnitRow({ unit, board }: { unit: CadUnit; board: CadBoard }) {
  const opener = useFileOpener()
  const selected = board.selected?.id === unit.id
  const elapsed = board.elapsedOf(unit)
  const busy = board.busyUnitId === unit.id
  // 図面ソフトで開くファイル（PDF は除く）
  const drawingIds = unit.drawings.filter((file) => !isPdf(file.originalName)).map((file) => file.id)

  // 背景の色: 選んだ行 > 長く作業中のまま（オレンジ） > 至急（薄い赤）
  const background = selected
    ? 'bg-navy-soft'
    : elapsed?.long
      ? 'bg-attention-soft hover:bg-attention-soft/70'
      : unit.isUrgent
        ? 'bg-urgent/5 hover:bg-urgent/10'
        : 'hover:bg-canvas'

  function openDrawings() {
    if (drawingIds.length === 1) void opener.open(drawingIds[0])
    else void opener.openAll(drawingIds)
  }

  return (
    <tr
      onClick={() => board.select(unit.id)}
      aria-selected={selected}
      className={`cursor-pointer border-b border-line ${background}`}
    >
      <td className="px-3 py-3 tabular-nums">
        {unit.isUrgent && <span className="block text-xs font-bold text-urgent">至急</span>}
        <span className="font-semibold">{shortDueDateText(unit.dueDateType, unit.dueDate)}</span>
      </td>
      <td className="px-2 py-3 font-semibold tabular-nums">{unit.intakeNo}</td>
      <td className="px-2 py-3">
        <span className="block truncate font-semibold" title={unit.customerName ?? undefined}>
          {unit.customerName ?? '—'}
        </span>
        <span className="block truncate text-xs text-neutral-600" title={unit.projectName ?? undefined}>
          {unit.projectName}
        </span>
      </td>
      <td className="px-2 py-3">
        {drawingIds.length > 0 ? (
          <button
            type="button"
            onClick={(event) => {
              // 行を選ぶ動き（tr の onClick）まで届かないようにする
              event.stopPropagation()
              openDrawings()
            }}
            disabled={opener.openingId !== null}
            title={opener.error ?? '図面ソフトで開く'}
            className={SMALL_BUTTON}
          >
            {opener.openingId !== null ? '…' : `DXF${drawingIds.length > 1 ? ` ${drawingIds.length}` : ''}`}
          </button>
        ) : (
          <span className="text-xs text-neutral-400">なし</span>
        )}
      </td>
      <td className="px-2 py-3">
        <span
          className={`block text-xs font-semibold ${
            unit.status === 'cad_waiting' ? 'text-neutral-500' : 'text-navy'
          }`}
        >
          {cadStatusLabel(unit.status)}
        </span>
        <span className="block truncate text-xs text-neutral-700">{unit.assigneeName ?? '—'}</span>
        {elapsed && (
          <span className={`block text-xs ${elapsed.long ? 'font-bold text-attention' : 'text-neutral-500'}`}>
            {elapsed.text}経過
          </span>
        )}
        {unit.status === 'ready' && unit.readyAt && (
          <span className="block text-xs text-neutral-500 tabular-nums">{formatShortDateTime(unit.readyAt)}</span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        {unit.status === 'cad_waiting' && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              void board.start(unit)
            }}
            disabled={busy}
            className={SMALL_BUTTON}
          >
            {busy ? '記録中…' : '作業開始'}
          </button>
        )}
        {unit.status === 'cad_working' && (
          // 押すと、隠したファイルの欄（CAD_CSV_INPUT_ID）のファイルを選ぶ画面が開く
          <label
            htmlFor={CAD_CSV_INPUT_ID}
            onClick={(event) => {
              event.stopPropagation()
              // 登録の途中は開かない（label には disabled がないため、既定の動きを止める）
              if (busy) {
                event.preventDefault()
                return
              }
              board.pickCsv(unit)
            }}
            aria-disabled={busy}
            className={`inline-block cursor-pointer ${PRIMARY_SMALL_BUTTON} ${busy ? 'opacity-60' : ''}`}
          >
            {busy ? '登録中…' : 'CSV を登録'}
          </label>
        )}
      </td>
    </tr>
  )
}
