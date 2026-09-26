// 最低保証重量と枚単価の判定。
//
// 1枚あたりの重量が小さい製品でも加工の手間は変わらないため、保証重量を設けている
// （docs/basic-design.md「最低保証重量」）。
//
//   1.5kg の段あり: 1.5kg未満 → kg単価 × 1.5（5円単位で切り捨て）、2kg未満 → × 2、2kg以上 → kg単価
//   1.5kg の段なし: 2kg未満 → × 2、2kg以上 → kg単価
//   独自の最低保証重量あり（スプライス 3kg）: 3kg未満 → × 3、3kg以上 → kg単価
//   常に枚単価（ベタ丸・ドーナツ）: 2kg以上は重量を小数第1位に丸めて kg単価を掛ける
//
// 保証重量は、エキストラをすべて加算した後の kg単価に掛ける。
// 枚単価の円未満は切り上げる。ただし 1.5kg の段は 5円単位で切り捨てる（結果が整数になるため追加の丸めは不要）。

import { ceilToYen, floorTo5, roundTo } from './rounding'
import type { MinimumWeightRule } from './types'

// 1.5kg の段・2kg の段の境目
const LIGHT_TIER_WEIGHT = 1.5
const STANDARD_TIER_WEIGHT = 2

export type MinimumWeightResult = {
  priceUnit: 'kg' | '枚'
  // priceUnit が kg なら kg単価、枚 なら枚単価
  unitPrice: number
  // 単価の根拠にした1枚あたりの重量
  billingWeight: number
}

// 枚単価 = kg単価 × 重量。円未満は切り上げる（例: 178.5 × 3 = 535.5 → 536）
function piecePrice(kgUnitPrice: number, weight: number): number {
  return ceilToYen(kgUnitPrice * weight)
}

export function applyMinimumWeight(
  kgUnitPrice: number,
  // 1枚あたりの重量（丸める前の値）
  pieceWeight: number,
  rule: Pick<MinimumWeightRule, 'hasLightTier' | 'minWeight' | 'alwaysPiecePrice'>,
): MinimumWeightResult {
  // 独自の最低保証重量（スプライスの 3kg）がある場合は、1.5kg / 2kg の段の代わりにそれを使う
  if (rule.minWeight !== null) {
    if (pieceWeight < rule.minWeight) {
      return {
        priceUnit: '枚',
        unitPrice: piecePrice(kgUnitPrice, rule.minWeight),
        billingWeight: rule.minWeight,
      }
    }
    return { priceUnit: 'kg', unitPrice: kgUnitPrice, billingWeight: pieceWeight }
  }

  // 1.5kg の段: 枚単価は 5円単位で切り捨てる（例: 185 × 1.5 = 277.5 → 275）
  if (rule.hasLightTier && pieceWeight < LIGHT_TIER_WEIGHT) {
    return {
      priceUnit: '枚',
      unitPrice: floorTo5(kgUnitPrice * LIGHT_TIER_WEIGHT),
      billingWeight: LIGHT_TIER_WEIGHT,
    }
  }

  // 2kg の段
  if (pieceWeight < STANDARD_TIER_WEIGHT) {
    return {
      priceUnit: '枚',
      unitPrice: piecePrice(kgUnitPrice, STANDARD_TIER_WEIGHT),
      billingWeight: STANDARD_TIER_WEIGHT,
    }
  }

  // 2kg以上で常に枚単価の製品（ベタ丸・ドーナツ）は、重量を小数第1位に丸めて kg単価を掛ける
  // （社内の計算用 Excel と同じ計算方法）
  if (rule.alwaysPiecePrice) {
    const roundedWeight = roundTo(pieceWeight, 1)
    return {
      priceUnit: '枚',
      unitPrice: piecePrice(kgUnitPrice, roundedWeight),
      billingWeight: roundedWeight,
    }
  }

  return { priceUnit: 'kg', unitPrice: kgUnitPrice, billingWeight: pieceWeight }
}
