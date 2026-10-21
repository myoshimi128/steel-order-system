'use client'

// 受注登録待ちの一覧の表（画面イメージ 06a の中央）。
//   上: 検索の欄（受付No.・売り先・工事名で絞り込む）と並び順の説明
//   列: 至急・納期・受付No.・売り先・工事名・区分・追加・受付の担当・操作（この区分の起票を完了）
// 行の中身は QueueUnitRow。

import { Icon } from '@/components/layout/icon'
import type { OrderQueue } from '@/lib/intake/use-order-queue'
import { QueueUnitRow } from './queue-unit-row'

export function QueueList({ queue }: { queue: OrderQueue }) {
  const rows = queue.visibleRows

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <label className="relative w-80">
          <span className="sr-only">受付No.・売り先・工事名で検索</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={queue.query}
            onChange={(event) => queue.setQuery(event.target.value)}
            placeholder="受付No.・売り先・工事名で検索"
            className="w-full rounded border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </label>
        <span className="text-xs text-neutral-500">
          並び順: <span className="font-bold text-urgent">至急</span> → 納期の早い順 → 納期の日付なし
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-canvas text-left text-xs text-neutral-500">
            <tr>
              <th className="w-16 px-3 py-2 font-semibold">
                <span className="sr-only">至急</span>
              </th>
              <th className="w-16 px-2 py-2 font-semibold">納期</th>
              <th className="w-20 px-2 py-2 font-semibold">受付No.</th>
              <th className="w-36 px-2 py-2 font-semibold">売り先</th>
              <th className="px-2 py-2 font-semibold">工事名</th>
              <th className="w-40 px-2 py-2 font-semibold">区分</th>
              <th className="w-28 px-2 py-2 font-semibold">追加</th>
              <th className="w-24 px-2 py-2 font-semibold">受付の担当</th>
              <th className="w-28 px-2 py-2 font-semibold">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((unit) => (
              <QueueUnitRow key={unit.id} unit={unit} queue={queue} />
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            {queue.totalCount === 0 ? 'この加工場所の受注登録待ちはありません' : '検索に当てはまる行はありません'}
          </p>
        )}
      </div>
    </div>
  )
}
