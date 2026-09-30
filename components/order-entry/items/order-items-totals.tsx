// 明細の合計（重量・仕入金額・単価未定の件数）。
// 重量は計算できた行、仕入金額は仕入単価が決まった行だけを合計する。
// 単価未定は、別途見積もりで仕入単価が空欄になる行の数（受注の修正で後から入力する）。

import type { ItemTotals } from '@/lib/order-entry/calculate-item'
import { ITEM_GRID_CLASS } from './item-grid'

type OrderItemsTotalsProps = {
  totals: ItemTotals
}

export function OrderItemsTotals({ totals }: OrderItemsTotalsProps) {
  return (
    <div
      className={`${ITEM_GRID_CLASS} border-t border-neutral-300 bg-neutral-50 py-2 text-sm font-semibold dark:border-neutral-700 dark:bg-neutral-950`}
    >
      <span className="col-span-5 text-right">合計</span>
      <span className="text-right tabular-nums">{totals.totalWeight.toFixed(2)}</span>
      <span className="text-right tabular-nums">{totals.totalAmount.toLocaleString('ja-JP')}</span>
      <span className="text-amber-700 dark:text-amber-400">
        {totals.quoteCount > 0 ? `単価未定 ${totals.quoteCount}件` : ''}
      </span>
    </div>
  )
}
