'use client'

// 明細の各行の重量・仕入単価と、明細の合計を求めるカスタムフック。
//
// 行の解釈（use-order-items の checks）から価格マスタの行を取得する条件を作り、
// 取得済みの行（use-item-pricing）を使って lib/pricing で計算する。
// 計算は描画のたびに行う（純粋な関数で、100 行程度なら十分に速い）。

import type { PricingRowConditions } from '@/lib/pricing/fetch-pricing-masters'
import {
  calculateItem,
  pricingConditionsOf,
  sumItems,
  type ItemCalculation,
  type ItemTotals,
} from './calculate-item'
import { useItemPricing } from './use-item-pricing'
import type { ItemRowCheck } from './validate-order-items'

export type ItemRowCalculation = {
  conditions: PricingRowConditions | null
  calculation: ItemCalculation
  // 価格マスタの行を取得できなかった場合のメッセージ
  pricingError?: string
}

export function useItemCalculations(checks: readonly ItemRowCheck[], orderDate: string) {
  const conditionsList = checks.map((check) => pricingConditionsOf(check.resolved, orderDate))
  const pricing = useItemPricing(conditionsList)

  const rows: ItemRowCalculation[] = checks.map((check, index) => {
    const conditions = conditionsList[index]
    return {
      conditions,
      calculation: calculateItem(check.resolved, pricing.mastersFor(conditions), orderDate),
      pricingError: pricing.errorFor(conditions),
    }
  })

  const totals: ItemTotals = sumItems(rows.map((row) => row.calculation))
  return { rows, totals }
}
