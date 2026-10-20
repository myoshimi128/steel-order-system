'use client'

// CAD の一覧の表（画面イメージ 05 の左側）。
//   上: 検索の欄（受付No.・売り先・工事名で絞り込む）と並び順の説明
//   列: 納期（至急の印）・受付No.・売り先／工事名・加工場所・図面・状態／担当・操作
//   下: 作業開始の案内
// 1280px の画面に右のパネルと並べるため、売り先と工事名、状態と担当は 1 つの列に 2 段で出す。
// 行の中身は CadUnitRow。

import { Icon } from '@/components/layout/icon'
import { CAD_LONG_RUNNING_HOURS } from '@/lib/intake/constants'
import type { CadBoard } from '@/lib/intake/use-cad-board'
import { CadUnitRow } from './cad-unit-row'

// タブごとの並び順の説明
const ORDER_TEXT = {
  active: (
    <>
      並び順: <span className="font-bold text-urgent">至急</span> → 納期の早い順
    </>
  ),
  csv: <>並び順: CSV の登録が新しい順</>,
} as const

export function CadUnitList({ board }: { board: CadBoard }) {
  const rows = board.visibleRows

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <label className="relative w-72">
          <span className="sr-only">受付No.・売り先・工事名で検索</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={board.query}
            onChange={(event) => board.setQuery(event.target.value)}
            placeholder="受付No.・売り先で検索"
            className="w-full rounded border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </label>
        <span className="text-xs text-neutral-500">{ORDER_TEXT[board.tab]}</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-canvas text-left text-xs text-neutral-500">
            <tr>
              <th className="w-16 px-3 py-2 font-semibold">納期</th>
              <th className="w-[72px] px-2 py-2 font-semibold">受付No.</th>
              <th className="px-2 py-2 font-semibold">売り先／工事名</th>
              <th className="w-16 px-2 py-2 font-semibold">加工場所</th>
              <th className="w-[68px] px-2 py-2 font-semibold">図面</th>
              <th className="w-28 px-2 py-2 font-semibold">状態／担当</th>
              <th className="w-[92px] px-2 py-2 font-semibold">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((unit) => (
              <CadUnitRow key={unit.id} unit={unit} board={board} />
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            {board.totalCount === 0
              ? board.tab === 'active'
                ? 'CAD の作業待ちはありません'
                : 'CSV 登録済（起票前）のアイトレはありません'
              : '検索に当てはまる行はありません'}
          </p>
        )}
      </div>

      <p className="border-t border-line px-4 py-3 text-xs text-neutral-500">
        {board.tab === 'active'
          ? `「作業開始」を押すと担当者が記録され、ほかの人の画面にも「作業中」と表示されます。作業中のまま ${CAD_LONG_RUNNING_HOURS} 時間以上たった行はオレンジで表示します（CSV の入れ忘れの確認）`
          : 'CSV を間違えたときは、行を選んで右のパネルで入れ直すか外してください。起票が終わると一覧から消えます'}
      </p>
    </div>
  )
}
