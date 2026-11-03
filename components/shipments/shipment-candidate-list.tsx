'use client'

// 送り状を作れる受注の一覧の表（入口の画面の下。加工場所のタブの中）。
//   上: 検索の欄（受注No.・得意先・納入先・工事名で絞り込む）と並び順の説明
//   表: 至急・納期・受注No.・得意先・納入先・工事名・配達・状態・残り / 受注数量・操作
// 加工待ちの受注も並べる（現場用伝票が戻ったときに出荷待ちにする操作は作らず、加工待ちからそのまま送り状を作れるため）。
// 行の中身は ShipmentCandidateRow。

import { useState } from 'react'
import { Icon } from '@/components/layout/icon'
import { filterCandidates, type ShipmentCandidate } from '@/lib/shipments/candidates'
import { ShipmentCandidateRow } from './shipment-candidate-row'

export function ShipmentCandidateList({ rows }: { rows: readonly ShipmentCandidate[] }) {
  const [query, setQuery] = useState('')
  const visible = filterCandidates(rows, query)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <label className="relative w-80">
          <span className="sr-only">受注No.・得意先・納入先・工事名で検索</span>
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="受注No.・得意先・納入先・工事名で検索"
            className="w-full rounded border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </label>
        <span className="text-xs text-neutral-500">
          並び順: <span className="font-bold text-attention">最短出荷</span> → 納期の早い順 → 後報
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-canvas text-left text-xs text-neutral-500">
            <tr>
              <th className="w-14 px-3 py-2 font-semibold">
                <span className="sr-only">至急</span>
              </th>
              <th className="w-28 px-2 py-2 font-semibold">納期</th>
              <th className="w-28 px-2 py-2 font-semibold">受注No.</th>
              <th className="w-36 px-2 py-2 font-semibold">得意先</th>
              <th className="w-36 px-2 py-2 font-semibold">納入先</th>
              <th className="px-2 py-2 font-semibold">工事名</th>
              <th className="w-24 px-2 py-2 font-semibold">配達</th>
              <th className="w-32 px-2 py-2 font-semibold">状態</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">残り / 受注</th>
              <th className="w-28 px-2 py-2 font-semibold">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <ShipmentCandidateRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            {rows.length === 0 ? 'この加工場所に、送り状を作る受注はありません' : '検索に当てはまる行はありません'}
          </p>
        )}
      </div>
    </div>
  )
}
