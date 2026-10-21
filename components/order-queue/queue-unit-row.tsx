'use client'

// 受注登録待ちの一覧の 1 行。
//   ・至急の行は背景を薄い赤にし、左に「至急」の印を出す
//   ・区分: 先寸は枠だけの印、アイトレは塗った印。CSV が登録されていれば「✓ CSV 登録済」を添える
//   ・追加: 人が「受注登録待ちに追加」で入れた区分の理由（見落とし追加は赤い枠、口頭・その他は灰色）。
//     メモがあれば、マウスを乗せると出す
//   ・行を押すと受注登録の画面を開く。右の「起票を完了」で一覧から外す（確認のダイアログを出す）

import { shortDueDateText } from '@/lib/intake/cad'
import { WORK_UNIT_KIND_LABELS } from '@/lib/intake/constants'
import { queueOriginLabel } from '@/lib/intake/queue'
import type { QueueUnit } from '@/lib/intake/types'
import type { OrderQueue } from '@/lib/intake/use-order-queue'

export function QueueUnitRow({ unit, queue }: { unit: QueueUnit; queue: OrderQueue }) {
  const originLabel = queueOriginLabel(unit)
  const busy = queue.busyUnitId === unit.id

  return (
    <tr
      onClick={() => queue.open(unit)}
      className={`cursor-pointer border-b border-line ${
        unit.isUrgent ? 'bg-urgent/5 hover:bg-urgent/10' : 'hover:bg-canvas'
      }`}
    >
      <td className={`px-3 py-3 ${unit.isUrgent ? 'border-l-4 border-urgent' : ''}`}>
        {unit.isUrgent && <span className="rounded bg-urgent px-1.5 py-0.5 text-xs font-bold text-white">至急</span>}
      </td>
      <td className={`px-2 py-3 tabular-nums ${unit.dueDate ? 'font-semibold' : 'text-neutral-400'}`}>
        {shortDueDateText(unit.dueDateType, unit.dueDate)}
      </td>
      <td className="px-2 py-3 font-semibold tabular-nums">{unit.intakeNo}</td>
      <td className="px-2 py-3">
        <span className="block truncate" title={unit.customerName ?? undefined}>
          {unit.customerName ?? '—'}
        </span>
      </td>
      <td className="px-2 py-3">
        <span className="block truncate" title={unit.projectName ?? undefined}>
          {unit.projectName}
        </span>
      </td>
      <td className="px-2 py-3">
        <span className="flex items-center gap-1.5">
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              unit.kind === 'aitore' ? 'bg-navy text-white' : 'border border-navy text-navy'
            }`}
          >
            {WORK_UNIT_KIND_LABELS[unit.kind]}
          </span>
          {unit.hasCsv && <span className="text-xs text-neutral-600">✓ CSV 登録済</span>}
        </span>
      </td>
      <td className="px-2 py-3">
        {originLabel && (
          <span
            title={unit.note ?? undefined}
            className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
              unit.origin === 'oversight'
                ? 'border border-urgent/50 bg-urgent/5 text-urgent'
                : 'bg-canvas text-neutral-600'
            }`}
          >
            {originLabel}
            {unit.note && '…'}
          </span>
        )}
      </td>
      <td className="truncate px-2 py-3 text-xs">{unit.staffName ?? '—'}</td>
      <td className="px-2 py-3 text-right">
        <button
          type="button"
          onClick={(event) => {
            // 行を押したとき（受注登録の画面を開く）の動きまで届かないようにする
            event.stopPropagation()
            void queue.complete(unit)
          }}
          disabled={busy}
          className="rounded border border-line bg-white px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-canvas disabled:opacity-50"
        >
          {busy ? '外しています…' : '起票を完了'}
        </button>
      </td>
    </tr>
  )
}
