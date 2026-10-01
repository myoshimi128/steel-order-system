// 明細の合計（重量・仕入金額・単価未定の件数）。
//
//   重量    : 材料の行だけを合計する（加工の行は重量を持たない。材料の重量を二重に計上しないため）。
//             単価が未確定・別途見積もりの行も、重量が出ていれば含める
//   仕入金額: 材料の行と加工の行の両方を合計する（仕入単価が決まった行だけ）
//   単価未定: 別途見積もりの材料の行と、仕入単価が空欄の加工の行の数

import type { ItemCalculation } from './calculate-item'
import type { ProcessCalculation } from './process-row'

// 行ごとの計算結果（材料の行か加工の行か）
export type RowCalculationResult =
  | { kind: 'material'; calculation: ItemCalculation }
  | { kind: 'process'; calculation: ProcessCalculation }

export type ItemTotals = {
  totalWeight: number
  totalAmount: number
  // 仕入単価が決まっていない行の数（受注の修正で後から入力する）
  quoteCount: number
}

export function sumRows(rows: readonly RowCalculationResult[]): ItemTotals {
  let totalWeight = 0
  let totalAmount = 0
  let quoteCount = 0
  for (const row of rows) {
    if (row.kind === 'material') {
      const { weight, price } = row.calculation
      if (weight) {
        totalWeight += weight.totalWeight
      }
      if (price.status === 'priced') {
        totalAmount += price.amount
      } else if (price.status === 'quote') {
        quoteCount += 1
      }
    } else if (row.calculation.status === 'priced') {
      totalAmount += row.calculation.amount
    } else if (row.calculation.status === 'unpriced') {
      quoteCount += 1
    }
  }
  // 浮動小数点の誤差が合計で目立たないよう、重量は小数第 2 位までに丸める
  return { totalWeight: Math.round(totalWeight * 100) / 100, totalAmount, quoteCount }
}
