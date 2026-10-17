// 明細の合計（数量・重量）。どちらも材料の行だけを合計する
// （加工の行の数量は孔数などで単位が違い、重量は持たないため）。
// 仕入金額の合計と単価未定の件数は出さない（受注登録の画面には単価を出さない。仕入入力で扱う）。

import { ITEM_GRID_CLASS } from './item-grid'

type OrderItemsTotalsProps = {
  totalQuantity: number
  totalWeight: number
}

export function OrderItemsTotals({ totalQuantity, totalWeight }: OrderItemsTotalsProps) {
  return (
    <div className={`${ITEM_GRID_CLASS} border-t border-neutral-300 bg-canvas py-2 text-[13px] font-semibold`}>
      <span className="col-span-7 text-right">合計</span>
      <span className="text-right tabular-nums">{totalQuantity.toLocaleString('ja-JP')}</span>
      <span className="text-right tabular-nums">{totalWeight.toFixed(2)}</span>
    </div>
  )
}
