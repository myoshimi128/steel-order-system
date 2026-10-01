'use client'

// 明細の各行の重量・仕入単価・仕入金額と、明細の合計を求めるカスタムフック。
//
//   材料の行: 行の解釈から価格マスタの行を取得する条件を作り、取得済みの行（use-item-pricing）を使って
//             lib/pricing で計算する
//   加工の行: 手入力の仕入単価から仕入金額を求める。単位が kg の場合は、
//             母材（直上の材料の行）の単価の根拠にした重量の合計を使う
// 計算は描画のたびに行う（純粋な関数で、100 行程度なら十分に速い）。

import type { PricingRowConditions } from '@/lib/pricing/fetch-pricing-masters'
import { calculateItem, pricingConditionsOf } from './calculate-item'
import { parentIndexOf } from './item-structure'
import { sumRows, type ItemTotals, type RowCalculationResult } from './item-totals'
import type { ItemRowValues } from './item-types'
import { calculateProcess, parentBillingTotalWeight } from './process-row'
import { useItemPricing } from './use-item-pricing'
import type { RowCheck } from './validate-order-items'

export type ItemRowCalculation = RowCalculationResult & {
  conditions: PricingRowConditions | null
  // 価格マスタの行を取得できなかった場合のメッセージ
  pricingError?: string
}

export function useItemCalculations(
  rows: readonly ItemRowValues[],
  checks: readonly RowCheck[],
  orderDate: string,
) {
  const conditionsList = checks.map((check) =>
    check.kind === 'material' ? pricingConditionsOf(check.resolved, orderDate) : null,
  )
  const pricing = useItemPricing(conditionsList)

  // まず材料の行を計算し、その結果を使って加工の行（kg 単位は母材の重量が必要）を計算する
  const results: ItemRowCalculation[] = []
  checks.forEach((check, index) => {
    const conditions = conditionsList[index]
    if (check.kind === 'material') {
      results.push({
        kind: 'material',
        conditions,
        calculation: calculateItem(check.resolved, pricing.mastersFor(conditions), orderDate),
        pricingError: pricing.errorFor(conditions),
      })
      return
    }
    // 加工の行: 母材（上にあるいちばん近い材料の行）の、単価の根拠にした重量の合計を使う
    const parentIndex = parentIndexOf(rows, index)
    const parent = parentIndex >= 0 ? results[parentIndex] : undefined
    const parentCheck = parentIndex >= 0 ? checks[parentIndex] : undefined
    const parentWeight =
      parent?.kind === 'material' && parentCheck?.kind === 'material'
        ? parentBillingTotalWeight(parent.calculation, parentCheck.resolved.quantity)
        : null
    results.push({
      kind: 'process',
      conditions: null,
      calculation: calculateProcess(check.resolved, parentWeight),
    })
  })

  const totals: ItemTotals = sumRows(results)
  return { rows: results, totals }
}
