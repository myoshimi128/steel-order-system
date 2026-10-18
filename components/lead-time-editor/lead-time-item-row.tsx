'use client'

// 工程ごとの目安納期の表の 1 行（工程・目安日数・混雑度・補足・並べ替え）。
// 新しく追加した工程は、名前を入れる欄と、取り消しの × を出す（既存の工程の名前は変えない・消せない）。

import { Icon } from '@/components/layout/icon'
import type { Congestion } from '@/lib/intake/constants'
import type { LeadTimeDraftItem } from '@/lib/lead-time/draft'
import { CongestionSelector } from './congestion-selector'

type LeadTimeItemRowProps = {
  item: LeadTimeDraftItem
  error?: string
  // 閲覧のみ（現場のユーザー）のときは false
  editable: boolean
  isFirst: boolean
  isLast: boolean
  onDaysChange: (text: string) => void
  onCongestionChange: (value: Congestion) => void
  onNoteChange: (text: string) => void
  onNameChange: (text: string) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

// 表の中の入力欄の共通の見た目
const INPUT_CLASS =
  'rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 disabled:border-transparent disabled:bg-transparent'

export function LeadTimeItemRow({
  item,
  error,
  editable,
  isFirst,
  isLast,
  onDaysChange,
  onCongestionChange,
  onNoteChange,
  onNameChange,
  onRemove,
  onMove,
}: LeadTimeItemRowProps) {
  const isNew = item.id === null
  const consult = item.congestion === 'consult'
  // 読み上げ用の工程の名前（名前を入れる前の新しい行は「追加する工程」）
  const label = item.name.trim() || '追加する工程'

  return (
    <>
      <tr className={error ? '' : 'border-b border-line last:border-b-0'}>
        <td className="py-2.5 pl-4 pr-2 align-middle">
          {isNew ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={item.name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="工程の名前"
                aria-label="追加する工程の名前"
                maxLength={20}
                // 追加した直後に名前を打てるよう、欄に入る
                autoFocus
                className={`${INPUT_CLASS} w-24`}
              />
              <button
                type="button"
                onClick={onRemove}
                title="追加を取り消す"
                className="rounded p-1 text-neutral-400 hover:bg-canvas hover:text-neutral-700"
              >
                <Icon name="x" className="h-4 w-4" />
                <span className="sr-only">追加を取り消す</span>
              </button>
            </div>
          ) : (
            <span className="text-sm font-bold text-neutral-900">{item.name}</span>
          )}
        </td>

        <td className="px-2 py-2.5 align-middle">
          <div className="flex items-baseline gap-1.5">
            <input
              type="text"
              inputMode="numeric"
              value={consult ? '' : item.days}
              onChange={(event) => onDaysChange(event.target.value)}
              // 要相談のときは日数を使わない（ホームでは「—」）
              disabled={!editable || consult}
              placeholder={consult ? '—' : ''}
              aria-label={`${label}の目安日数（営業日）`}
              aria-invalid={error !== undefined}
              className={`${INPUT_CLASS} w-12 text-right text-base font-semibold tabular-nums ${
                error ? 'border-urgent' : ''
              }`}
            />
            <span className="text-xs text-neutral-500">営業日</span>
          </div>
        </td>

        <td className="px-2 py-2.5 align-middle">
          <CongestionSelector
            label={`${label}の混雑度`}
            value={item.congestion}
            onChange={onCongestionChange}
            disabled={!editable}
          />
        </td>

        <td className="px-2 py-2.5 align-middle">
          <input
            type="text"
            value={item.note}
            onChange={(event) => onNoteChange(event.target.value)}
            disabled={!editable}
            placeholder={editable ? '—' : ''}
            aria-label={`${label}の補足`}
            maxLength={100}
            className={`${INPUT_CLASS} w-full`}
          />
        </td>

        {editable && (
          <td className="py-2.5 pl-1 pr-3 align-middle">
            <div className="flex">
              <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={isFirst}
                title="上へ"
                className="rounded p-1 text-neutral-500 hover:bg-canvas disabled:opacity-30"
              >
                <Icon name="arrow-up" className="h-4 w-4" />
                <span className="sr-only">{label}を上へ</span>
              </button>
              <button
                type="button"
                onClick={() => onMove(1)}
                disabled={isLast}
                title="下へ"
                className="rounded p-1 text-neutral-500 hover:bg-canvas disabled:opacity-30"
              >
                <Icon name="arrow-down" className="h-4 w-4" />
                <span className="sr-only">{label}を下へ</span>
              </button>
            </div>
          </td>
        )}
      </tr>

      {error && (
        // エラーは行のすぐ下に、表の幅いっぱいに出す
        <tr className="border-b border-line last:border-b-0">
          <td colSpan={editable ? 5 : 4} className="px-4 pb-2.5 text-xs text-urgent" role="alert">
            {error}
          </td>
        </tr>
      )}
    </>
  )
}
