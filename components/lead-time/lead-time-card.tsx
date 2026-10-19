// 1 つの部署の目安納期のカード（ホームと、納期連絡の「ホームでの表示」のプレビューで共通）。
// docs/intake/screen-design.md「S-01 ホーム」:
//   ・工程ごとに、名前・日数（営業日）・混雑度の印
//   ・混雑度が「要相談」の工程と、日数が未入力の工程は、日数の代わりに「—」
//   ・部署メッセージは、表示期限の日まで出す
//   ・見出しの右に、最後に公開した日時と人
// 補足（note）はホームには出さない。

import { Icon } from '@/components/layout/icon'
import { DEPARTMENT_LABELS } from '@/lib/intake/constants'
import { displayDays, formatShortDateTime, isMessageVisible } from '@/lib/lead-time/display'
import type { LeadTimeDept, LeadTimeItem } from '@/lib/lead-time/types'
import { CongestionBadge } from './congestion-badge'

type LeadTimeCardProps = {
  dept: LeadTimeDept
  items: LeadTimeItem[]
  message: string | null
  expiresOn: string | null
  updatedAt: string | null
  updatedByName: string | null
  // 今日の日付 'YYYY-MM-DD'（メッセージの表示期限の判定に使う）
  today: string
}

// 工程の数に合わせた列の数（2 つまでは横に並べ、3 つ以上は 3 列で折り返す）
function gridColumnsClass(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  return 'grid-cols-3'
}

export function LeadTimeCard({
  dept,
  items,
  message,
  expiresOn,
  updatedAt,
  updatedByName,
  today,
}: LeadTimeCardProps) {
  const showMessage = isMessageVisible(message, expiresOn, today)

  return (
    <article className="overflow-hidden rounded border border-line bg-white">
      <header className="flex items-baseline justify-between gap-3 border-b border-line bg-canvas/60 px-4 py-2.5">
        <h3 className="text-sm font-bold text-neutral-900">{DEPARTMENT_LABELS[dept]}</h3>
        {updatedAt && (
          <p className="text-xs text-neutral-400">
            更新 {formatShortDateTime(updatedAt)}
            {updatedByName && <span className="ml-2">{updatedByName}</span>}
          </p>
        )}
      </header>

      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-neutral-500">工程がありません</p>
      ) : (
        // 工程を格子状に並べる。gap-px と地の色で、工程の間に 1px の区切り線を出す
        <ul className={`grid gap-px bg-line ${gridColumnsClass(items.length)}`}>
          {items.map((item) => {
            const days = displayDays(item)
            return (
              <li key={item.id} className="bg-white px-4 py-2.5">
                <p className="truncate text-xs text-neutral-500">{item.name}</p>
                <p className="mt-0.5 flex items-baseline gap-1">
                  {days === null ? (
                    <span className="text-2xl font-bold leading-tight text-neutral-400">—</span>
                  ) : (
                    <>
                      <span className="text-2xl font-bold leading-tight tabular-nums text-neutral-900">
                        {days}
                      </span>
                      <span className="text-xs text-neutral-500">営業日</span>
                    </>
                  )}
                </p>
                <p className="mt-1">
                  <CongestionBadge congestion={item.congestion} />
                </p>
              </li>
            )
          })}
        </ul>
      )}

      {showMessage && (
        <p className="flex gap-2 border-t border-line px-4 py-2.5 text-sm text-neutral-700">
          <Icon name="chat" className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
          {/* 改行を入れたメッセージは、改行のとおりに出す */}
          <span className="whitespace-pre-wrap break-words">{message}</span>
        </p>
      )}
    </article>
  )
}
