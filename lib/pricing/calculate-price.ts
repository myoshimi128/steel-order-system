// 受注明細1行分の単価を求める入口の関数。
//
//   1. kg単価を求める（kg-unit-price.ts）
//   2. 小物の別途見積もりを判定する（切断単価の small_piece_quote_required）
//   3. 保証重量・枚単価を判定する（minimum-weight.ts）
//
// 画面からはこのファイルの関数を呼び、戻り値の status が 'quote' なら「別途」と表示して
// 単価を手入力させる。

import {
  findCuttingKgUnitPrice,
  findSpecialProductKgUnitPrice,
  type CuttingKgUnitPriceInput,
  type SpecialProductKgUnitPriceInput,
} from './kg-unit-price'
import { applyMinimumWeight } from './minimum-weight'
import type { KgUnitPriceResult, PriceResult, PricingMasters } from './types'

// 小物を別途見積もりにする境目（1枚 2kg 未満）
const SMALL_PIECE_WEIGHT = 2

// kg単価の結果と1枚あたりの重量から、最終的な単価を組み立てる
function finalizePrice(kgResult: KgUnitPriceResult, pieceWeight: number): PriceResult {
  if (kgResult.status === 'quote') {
    return kgResult
  }
  if (kgResult.rule.smallPieceQuoteRequired && pieceWeight < SMALL_PIECE_WEIGHT) {
    return { status: 'quote', reason: '1枚 2kg 未満のため別途見積もり' }
  }

  const minimum = applyMinimumWeight(kgResult.kgUnitPrice, pieceWeight, kgResult.rule)
  return {
    status: 'priced',
    kgUnitPrice: kgResult.kgUnitPrice,
    priceUnit: minimum.priceUnit,
    unitPrice: minimum.unitPrice,
    billingWeight: minimum.billingWeight,
    breakdown: kgResult.breakdown,
  }
}

// ------------------------------------------------------------
// 通常の切断（寸法切・アイトレ）
// ------------------------------------------------------------

export type CuttingPriceInput = CuttingKgUnitPriceInput & {
  // 1枚あたりの角重量（丸める前の値）。保証重量の判定に使う
  squareWeight: number
}

export function calculateCuttingPrice(
  input: CuttingPriceInput,
  masters: PricingMasters,
): PriceResult {
  return finalizePrice(findCuttingKgUnitPrice(input, masters), input.squareWeight)
}

// ------------------------------------------------------------
// 特殊製品（スプライス・ササラ・ベタ丸・ドーナツ）
// ------------------------------------------------------------

export type SpecialProductPriceInput = SpecialProductKgUnitPriceInput & {
  // 1枚あたりの重量（丸める前の値）。どれを単価の根拠にするかは
  // 特殊製品種別の weight_basis（角重量 / 実重量 / 使用材重量）で決まる
  squareWeight: number
  actualWeight?: number | null
  materialWeight?: number | null
}

// 特殊製品種別の weight_basis に従って、単価の根拠にする重量を選ぶ
function selectPricingWeight(input: SpecialProductPriceInput): number | null {
  switch (input.specialProductType.weight_basis) {
    case '実重量':
      return input.actualWeight ?? null
    case '使用材重量':
      return input.materialWeight ?? null
    default:
      return input.squareWeight
  }
}

export function calculateSpecialProductPrice(
  input: SpecialProductPriceInput,
  masters: PricingMasters,
): PriceResult {
  const pricingWeight = selectPricingWeight(input)
  if (pricingWeight === null) {
    // ササラの使用材重量など、手入力の重量がまだ入っていない
    return {
      status: 'quote',
      reason: `${input.specialProductType.weight_basis}が未入力のため単価を計算できない`,
    }
  }
  return finalizePrice(findSpecialProductKgUnitPrice(input, masters), pricingWeight)
}
