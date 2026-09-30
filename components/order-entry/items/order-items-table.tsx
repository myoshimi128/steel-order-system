'use client'

// 受注明細の表（見出し＋材料の行＋合計）。
// 明細が 100 行を超えることもあるため、この部分だけをスクロールさせる（ヘッダーは固定表示）。
// 加工の行（process-row.tsx）とスプライス専用の受注は次の作業でこのフォルダに追加する。

import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { plateTypeOptions, regionOptions } from '@/lib/order-entry/item-options'
import type { ItemMasters } from '@/lib/order-entry/item-types'
import type { ItemTotals } from '@/lib/order-entry/calculate-item'
import type { ItemRowCalculation } from '@/lib/order-entry/use-item-calculations'
import type { OrderItemsState } from '@/lib/order-entry/use-order-items'
import { HeaderCell } from './header-cell'
import { ITEM_GRID_CLASS } from './item-grid'
import { MaterialRow } from './material-row'
import { OrderItemsTotals } from './order-items-totals'

type OrderItemsTableProps = {
  items: OrderItemsState
  calculations: readonly ItemRowCalculation[]
  totals: ItemTotals
  masters: ItemMasters
  navigation: FieldNavigation
  onNotice: (message: string) => void
}

export function OrderItemsTable({
  items,
  calculations,
  totals,
  masters,
  navigation,
  onNotice,
}: OrderItemsTableProps) {
  // 選択肢はマスタから作る（行ごとに作り直さないよう、表で 1 回だけ作る）
  const regions = regionOptions(masters)
  const plateTypes = plateTypeOptions(masters)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 見出し */}
      <div
        className={`${ITEM_GRID_CLASS} bg-slate-900 py-2 text-xs font-semibold text-white dark:bg-slate-800`}
      >
        <HeaderCell top="No" />
        <HeaderCell top="切断方法" bottom="区分" />
        <HeaderCell top="種類" bottom="製鋼法" />
        <HeaderCell top="材質" bottom="メーカー" />
        <HeaderCell top="品名" bottom="寸法（板厚 × 縦 × 横）" />
        <HeaderCell top="数量" bottom="重量(kg)" />
        <HeaderCell top="仕入単価" bottom="仕入金額" />
        <HeaderCell top="摘要" />
      </div>

      {/* 材料の行（この部分だけスクロールする） */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {items.rows.map((row, index) => (
          <MaterialRow
            key={row.key}
            index={index}
            items={items}
            calculation={calculations[index]}
            errors={items.errorsOf(row.key, index)}
            masters={masters}
            regionOptions={regions}
            plateTypeOptions={plateTypes}
            navigation={navigation}
            onNotice={onNotice}
          />
        ))}
        {items.itemsError && (
          <p className="px-6 py-2 text-sm text-red-600 dark:text-red-400">{items.itemsError}</p>
        )}
      </div>

      <OrderItemsTotals totals={totals} />
    </div>
  )
}
