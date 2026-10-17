'use client'

// 受注明細の表（見出し＋材料の行・加工の行＋合計）。
// 明細が 100 行を超えることもあるため、この部分だけをスクロールさせる（ヘッダーは固定表示）。
// 行の種類（材料の行 / 加工の行）に応じて、MaterialRow（2 段）と ProcessRow（1 段）を出し分ける。

import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import {
  plateTypeOptions,
  processTypeOptions,
  regionOptions,
} from '@/lib/order-entry/item-options'
import { materialNumbers } from '@/lib/order-entry/item-structure'
import {
  processNoticeTargetOf,
  processNoticesFor,
  type ProcessNoticeMaster,
} from '@/lib/order-entry/notices'
import type { ItemTotals } from '@/lib/order-entry/item-totals'
import type { ItemMasters } from '@/lib/order-entry/item-types'
import type { ItemRowCalculation } from '@/lib/order-entry/use-item-calculations'
import type { OrderItemsState } from '@/lib/order-entry/use-order-items'
import { HeaderCell } from './header-cell'
import { ITEM_GRID_CLASS } from './item-grid'
import { MaterialRow } from './material-row'
import { OrderItemsTotals } from './order-items-totals'
import { ProcessRow } from './process-row'

type OrderItemsTableProps = {
  items: OrderItemsState
  calculations: readonly ItemRowCalculation[]
  totals: ItemTotals
  masters: ItemMasters
  // 加工の注意事項（当てはまる加工の行のすぐ下に出す）
  processNotices: readonly ProcessNoticeMaster[]
  // スプライス専用の受注か（区分の欄が切断区分になる）
  isSplice: boolean
  navigation: FieldNavigation
  onNotice: (message: string) => void
}

export function OrderItemsTable({
  items,
  calculations,
  totals,
  masters,
  processNotices,
  isSplice,
  navigation,
  onNotice,
}: OrderItemsTableProps) {
  // 選択肢はマスタから作る（行ごとに作り直さないよう、表で 1 回だけ作る）
  const regions = regionOptions(masters, isSplice)
  const plateTypes = plateTypeOptions(masters)
  const processTypes = processTypeOptions(masters)
  // No 欄の番号（材料の行だけに 1 から振る）
  const numbers = materialNumbers(items.rows)

  return (
    // 見出し・明細の行・合計を 1 つのスクロールの枠に入れ、見出しは上端、合計は下端に固定する（sticky）。
    // 見出しや合計を枠の外に置くと、明細の行の側にだけスクロールバーの幅が入り、列の位置がずれるため。
    // scroll-pt / scroll-pb は、キー操作で欄を移ったときに、その欄が固定した見出し・合計の下に隠れないようにする余白
    <div className="min-h-0 flex-1 scroll-pt-14 scroll-pb-12 overflow-y-auto">
      {/* 見出し */}
      <div
        className={`${ITEM_GRID_CLASS} sticky top-0 z-10 bg-slate-900 py-2 text-xs font-semibold text-white dark:bg-slate-800`}
      >
        {/* No の列は見出しの文字を出さない（帯の左端が詰まって見えるため）。
            列の位置は残し、読み上げ用にだけ「No」を入れておく */}
        <div>
          <span className="sr-only">No</span>
        </div>
        <HeaderCell top="切断方法" bottom={isSplice ? '切断区分' : '区分'} />
        <HeaderCell top="種類" bottom="製鋼法" />
        <HeaderCell top="材質" bottom="メーカー" />
        <HeaderCell top="品名" bottom="寸法（板厚 × 縦 × 横）" />
        <HeaderCell top="数量" bottom="重量(kg)" />
        <HeaderCell top="仕入単価" bottom="仕入金額" />
        <HeaderCell top="摘要" />
      </div>

      {/* スプライス専用の受注の案内 */}
      {isSplice && (
        <p className="border-b border-blue-100 bg-blue-50 px-6 py-1.5 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
          <span className="font-semibold">スプライス専用の受注</span>
          　明細はすべてスプライス。ショットの有無は受注単位。切断区分は 1 寸法切 ／ 2
          アイトレ（アイトレは別途見積もり）／ 9 加工
        </p>
      )}

      {/* 明細の行 */}
      <div>
        {items.rows.map((row, index) => {
          const check = items.checks[index]
          const result = calculations[index]
          const errors = items.errorsOf(row.key, index)

          if (check.kind === 'process' && result.kind === 'process') {
            return (
              <ProcessRow
                key={row.key}
                index={index}
                items={items}
                resolved={check.resolved}
                // 母材の板厚・この行の穴径が条件に当てはまる加工の注意事項
                notices={processNoticesFor(
                  processNotices,
                  processNoticeTargetOf(items.rows, items.checks, index),
                )}
                calculation={result.calculation}
                errors={errors}
                isSplice={isSplice}
                regionOptions={regions}
                processTypeOptions={processTypes}
                navigation={navigation}
                onNotice={onNotice}
              />
            )
          }
          if (check.kind === 'material' && result.kind === 'material') {
            return (
              <MaterialRow
                key={row.key}
                index={index}
                number={numbers[index] ?? index + 1}
                items={items}
                check={check}
                calculation={result.calculation}
                pricingError={result.pricingError}
                errors={errors}
                masters={masters}
                isSplice={isSplice}
                regionOptions={regions}
                plateTypeOptions={plateTypes}
                navigation={navigation}
                onNotice={onNotice}
              />
            )
          }
          return null
        })}
        {items.itemsError && (
          <p className="px-6 py-2 text-sm text-red-600 dark:text-red-400">{items.itemsError}</p>
        )}
      </div>

      {/* 合計は枠の下端に固定する（明細が少なければ最後の行のすぐ下に出る） */}
      <div className="sticky bottom-0 z-10">
        <OrderItemsTotals totals={totals} />
      </div>
    </div>
  )
}
