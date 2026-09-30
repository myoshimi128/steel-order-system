// 明細（材料の行）の重量と仕入単価・仕入金額の計算。
//
// 重量・単価の計算そのものは lib/pricing の関数を使い、ここでは
//   ・区分に応じて、どの計算（通常の切断 / 特殊製品 / 定尺売り）を使うかを選ぶ
//   ・価格マスタの行を取得するための条件（get_pricing_rows の引数）を作る
//   ・画面に表示する値（合計重量・仕入金額）と、保存する値（1 枚あたりの重量）をそろえる
// を行う。画面（リアルタイムの計算）とサーバー（保存時の計算）の両方で同じ関数を使う。

import type { PricingRowConditions } from '@/lib/pricing/fetch-pricing-masters'
import { calcAmount } from '@/lib/pricing/amount'
import { calculateCuttingPrice, calculateSpecialProductPrice } from '@/lib/pricing/calculate-price'
import { calculateStandardPlatePrice } from '@/lib/pricing/standard-plate'
import type { PricingMasters } from '@/lib/pricing/types'
import { calcCircleWeight, calcRectangleWeight, calcTotalWeight } from '@/lib/pricing/weight'
import { PLATE_SIZE_DIMENSIONS } from '@/lib/pricing/standard-plate'
import type { ResolvedItem } from './resolve-item'

// 1 枚あたりの重量（丸める前の値）。保存する値
export type PieceWeights = {
  // 角重量（単価の根拠）
  squareWeight: number
  // 実重量（寸法から求まるもの: 寸法切・ベタ丸・ドーナツ。アイトレなどは送り状発行で入力するため null）
  actualWeight: number | null
  // 使用材の重量（ササラのみ）
  materialWeight: number | null
  // 重量の欄に表示する 1 枚あたりの重量（ベタ丸・ドーナツは実重量、ササラは使用材重量、それ以外は角重量）
  displayWeight: number
}

export type ItemCalculation =
  // 計算に必要な入力がそろっていない
  | { status: 'incomplete' }
  // 価格マスタの行を取得中（重量は先に表示できる）
  | { status: 'loading'; weights: PieceWeights; totalWeight: number }
  // 別途見積もり（仕入単価は空欄のまま登録する）
  | { status: 'quote'; reason: string; weights: PieceWeights; totalWeight: number }
  | {
      status: 'priced'
      weights: PieceWeights
      totalWeight: number
      unitPrice: number
      priceUnit: 'kg' | '枚'
      amount: number
    }

// ------------------------------------------------------------
// 重量
// ------------------------------------------------------------

// 1 枚あたりの重量を求める。入力がそろっていなければ null。
// 縞板は単位質量（unitWeight）を使い、それ以外は比重 7.85 の式で求める（lib/pricing/weight.ts）
export function calculatePieceWeights(item: ResolvedItem): PieceWeights | null {
  const { thickness, dimensions, dimensionKind, region } = item
  if (thickness === null || !dimensionKind) {
    return null
  }
  // 縞板でメーカーの単位質量がない場合は重量を計算できない
  if (item.needsManufacturer && item.unitWeight === null) {
    return null
  }
  const unitWeight = item.needsManufacturer ? item.unitWeight : null

  switch (dimensionKind) {
    case 'rectangle': {
      if (dimensions.width === null || dimensions.length === null) {
        return null
      }
      const square = calcRectangleWeight({
        thickness,
        width: dimensions.width,
        length: dimensions.length,
        unitWeight,
      })
      // ササラは入力した寸法が「使用材の寸法」で、その重量に単価を掛ける
      if (region?.kind === 'special' && region.type.weight_basis === '使用材重量') {
        return { squareWeight: square, actualWeight: null, materialWeight: square, displayWeight: square }
      }
      // 寸法切は角重量と実重量が同じ。アイトレの実重量は送り状発行の画面で入力する
      const isDimensionCut = region?.kind === 'cut' && region.cuttingType === '寸法切'
      return {
        squareWeight: square,
        actualWeight: isDimensionCut ? square : null,
        materialWeight: null,
        displayWeight: square,
      }
    }
    case 'circle':
    case 'donut': {
      if (dimensions.outerDiameter === null) {
        return null
      }
      if (dimensionKind === 'donut' && dimensions.innerDiameter === null) {
        return null
      }
      // 角重量は外径を縦横とした四角形で求める（単価の根拠）。実重量は円・ドーナツの式で求める
      const square = calcRectangleWeight({
        thickness,
        width: dimensions.outerDiameter,
        length: dimensions.outerDiameter,
        unitWeight,
      })
      const actual = calcCircleWeight({
        thickness,
        outerDiameter: dimensions.outerDiameter,
        innerDiameter: dimensionKind === 'donut' ? dimensions.innerDiameter : null,
        unitWeight,
      })
      // 伝票に載るのは実重量のため、重量の欄には実重量を表示する
      return { squareWeight: square, actualWeight: actual, materialWeight: null, displayWeight: actual }
    }
    case 'plateSize': {
      if (item.plateSize === null) {
        return null
      }
      const { width, length } = PLATE_SIZE_DIMENSIONS[item.plateSize]
      const square = calcRectangleWeight({ thickness, width, length, unitWeight })
      return { squareWeight: square, actualWeight: square, materialWeight: null, displayWeight: square }
    }
  }
}

// ------------------------------------------------------------
// 価格マスタの行を取得する条件
// ------------------------------------------------------------

// get_pricing_rows に渡す条件を作る。単価を計算できない行（入力がそろっていない・加工など）は null。
// 寸法や数量は条件に含めないため、同じ材質・板厚の行は同じ条件になり、取得した行を使い回せる
export function pricingConditionsOf(item: ResolvedItem, asOf: string): PricingRowConditions | null {
  const { region, plateType, thickness } = item
  if (!region || !plateType || thickness === null || !asOf) {
    return null
  }
  if (item.needsMaterial && !item.materialId) {
    return null
  }
  const base = { plateTypeId: plateType.id, materialId: item.materialId, thickness, asOf }

  switch (region.kind) {
    case 'cut':
      if (!item.cuttingMethod || item.cuttingMethod === '定尺') {
        return null
      }
      return { ...base, cuttingMethod: item.cuttingMethod, cuttingType: region.cuttingType }
    case 'special':
      return { ...base, specialProductTypeId: region.type.id }
    case 'standard':
      return item.plateSize ? { ...base, plateSize: item.plateSize } : null
    case 'process':
      return null
  }
}

// 条件を、取得結果を使い回すためのキー（文字列）にする
export function pricingConditionsKey(conditions: PricingRowConditions): string {
  return JSON.stringify([
    conditions.plateTypeId,
    conditions.materialId ?? null,
    conditions.thickness,
    conditions.asOf,
    conditions.cuttingMethod ?? null,
    conditions.cuttingType ?? null,
    conditions.specialProductTypeId ?? null,
    conditions.hasShot ?? false,
    conditions.plateSize ?? null,
  ])
}

// ------------------------------------------------------------
// 仕入単価・仕入金額
// ------------------------------------------------------------

// 行の重量と仕入単価・仕入金額を求める。
// pricingMasters は get_pricing_rows で取得した行（未取得なら undefined）
export function calculateItem(
  item: ResolvedItem,
  pricingMasters: PricingMasters | undefined,
  asOf: string,
): ItemCalculation {
  const weights = calculatePieceWeights(item)
  const conditions = pricingConditionsOf(item, asOf)
  const { region, plateType, thickness, quantity, productSelection } = item
  if (
    !weights ||
    !conditions ||
    !region ||
    !plateType ||
    thickness === null ||
    quantity === null ||
    !productSelection?.ok
  ) {
    return { status: 'incomplete' }
  }
  const totalWeight = calcTotalWeight(weights.displayWeight, quantity)
  if (!pricingMasters) {
    return { status: 'loading', weights, totalWeight }
  }

  // 製鋼法を入力しない行（定尺売り・縞板など）は、高炉材加算の対象外として電炉材で計算する
  const steelMaking = item.steelMaking ?? '電炉材'
  const shape = productSelection.pricingShape

  // --- 定尺売り: 定尺単価 × 合計重量（保証重量なし） ---
  if (region.kind === 'standard') {
    if (!item.plateSize) {
      return { status: 'incomplete' }
    }
    const result = calculateStandardPlatePrice(
      {
        plateType,
        materialId: item.materialId,
        thickness,
        plateSize: item.plateSize,
        quantity,
        unitWeight: item.needsManufacturer ? item.unitWeight : null,
        asOf,
      },
      pricingMasters,
    )
    if (result.status === 'quote') {
      return { status: 'quote', reason: result.reason, weights, totalWeight }
    }
    return {
      status: 'priced',
      weights,
      totalWeight: result.totalWeight,
      unitPrice: result.kgUnitPrice,
      priceUnit: 'kg',
      amount: result.amount,
    }
  }

  // 加工の行は材料の単価を持たない（次の作業で実装）
  if (region.kind === 'process') {
    return { status: 'incomplete' }
  }

  // --- 通常の切断・特殊製品 ---
  const price =
    region.kind === 'cut'
      ? calculateCuttingPrice(
          {
            plateType,
            materialId: item.materialId,
            thickness,
            shape,
            // pricingConditionsOf で、通常の切断には切断方法（定尺以外）が入っていることを確認済み
            cuttingMethod: conditions.cuttingMethod!,
            cuttingType: region.cuttingType,
            steelMaking,
            asOf,
            squareWeight: weights.squareWeight,
          },
          pricingMasters,
        )
      : calculateSpecialProductPrice(
          {
            specialProductType: region.type,
            plateType,
            materialId: item.materialId,
            thickness,
            shape,
            // 通常の受注の特殊製品は切断区分を持たない（スプライス専用の受注は次の作業）
            cuttingType: null,
            steelMaking,
            asOf,
            squareWeight: weights.squareWeight,
            actualWeight: weights.actualWeight,
            materialWeight: weights.materialWeight,
          },
          pricingMasters,
        )

  if (price.status === 'quote') {
    return { status: 'quote', reason: price.reason, weights, totalWeight }
  }
  return {
    status: 'priced',
    weights,
    totalWeight,
    unitPrice: price.unitPrice,
    priceUnit: price.priceUnit,
    amount: calcAmount(price, quantity),
  }
}

// ------------------------------------------------------------
// 合計
// ------------------------------------------------------------

export type ItemTotals = {
  totalWeight: number
  totalAmount: number
  // 別途見積もりで仕入単価が空欄になる行の数
  quoteCount: number
}

// 明細の合計。重量は計算できた行、金額は仕入単価が決まった行だけを合計する
export function sumItems(calculations: readonly ItemCalculation[]): ItemTotals {
  let totalWeight = 0
  let totalAmount = 0
  let quoteCount = 0
  for (const calculation of calculations) {
    if (calculation.status === 'incomplete') {
      continue
    }
    totalWeight += calculation.totalWeight
    if (calculation.status === 'priced') {
      totalAmount += calculation.amount
    } else if (calculation.status === 'quote') {
      quoteCount += 1
    }
  }
  // 浮動小数点の誤差が合計で目立たないよう、重量は小数第 2 位までに丸める
  return { totalWeight: Math.round(totalWeight * 100) / 100, totalAmount, quoteCount }
}
