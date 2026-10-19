// 「更新履歴」の区画。公開のたびに残した要約を、新しい順に出す（lead_time_history）。

import { Panel } from '@/components/layout/panel'
import { formatShortDateTime } from '@/lib/lead-time/display'
import type { LeadTimeHistoryEntry } from '@/lib/lead-time/types'

export function LeadTimeHistoryList({ history }: { history: LeadTimeHistoryEntry[] }) {
  return (
    <Panel title="更新履歴">
      {history.length === 0 ? (
        <p className="px-5 py-6 text-sm text-neutral-500">まだ公開していません</p>
      ) : (
        <ul>
          {history.map((entry) => (
            <li
              key={entry.id}
              className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 border-b border-line px-5 py-3 text-sm last:border-b-0"
            >
              <span className="font-semibold tabular-nums text-neutral-900">
                {formatShortDateTime(entry.changedAt)}
              </span>
              <span className="text-neutral-700">
                {entry.changedByName && (
                  <span className="mr-2 text-neutral-500">{entry.changedByName}</span>
                )}
                {entry.summary}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
