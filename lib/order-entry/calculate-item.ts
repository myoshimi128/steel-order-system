// 明細（材料の行）の重量と仕入単価・仕入金額の計算。
//
// 重量・単価の計算そのものは lib/pricing の関数を使い、ここでは
//   ・区分に応じて、どの計算（通常の切断 / 特殊製品 / 定尺売り）を使うかを選ぶ
//   ・価格マスタの行を取得するための条件（get_pricing_rows の引数）を作る
//   ・画面に表示する値（合計重量・仕入金額）と、保存する値（1 枚あたりの重量）をそろえる
// を行う。画面（リアルタイムの計算）とサーバー（保存時の計算）の両方で同じ関数を使う。
//
// 重量と単価は切り離して求める。
//   重量: 寸法・種類・材質（縞板は単位質量）・数量がそろえば計算する
//   単価: 重量に加えて、価格マスタの行（取得が必要）・ショットの有無などがそろったら計算する
// ショットが未入力・価格マスタの行が取得中・別途見積もりなど、単価が決まらない場合も重量は表示する。

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

// 行の重量。1 枚あたりの重量と、重量の欄に表示する合計重量（1 枚あたり × 数量）
export type ItemWeight = {
  weights: PieceWeights
  totalWeight: number
}

// 行の仕入単価・仕入金額の状態
export type ItemPrice =
  // 重量が出ていない（寸法・数量などの入力の途中）。単価の欄は空欄
  | { status: 'incomplete' }
  // 重量は出ているが、単価を決められない（ショット未入力・受注日未入力・取り扱いのない板厚など）。
  // 「未確定」と表示する。このままでは登録できない
  | { status: 'undetermined'; reason: string }
  // 価格マスタの行を取得中
  | { status: 'loading' }
  // 別途見積もり（仕入単価は空欄のまま登録する）
  | { status: 'quote'; reason: string }
  | {
      status: 'priced'
      unitPrice: number
      priceUnit: 'kg' | '枚'
      amount: number
    }

// 行の計算結果。重量（weight）と単価（price）は別々に持つ。
// weight が null のときは price も incomplete になる（単価の計算には重量が必要なため）
export type ItemCalculation = {
  weight: ItemWeight | null
  price: ItemPrice
}

// ------------------------------------------------------------
// 重量
// ------------------------------------------------------------

// 1 枚あたりの重量を求める。入力がそろっていなければ null。
// 縞板は単位質量（unitWeight）を使い、それ以外は比重 7.85 の式で求める（lib/pricing/weight.ts）。
// 単価の計算（価格マスタ・ショットの有無・別途見積もりの判定）には影響されない
export function calculatePieceWeights(item: ResolvedItem): PieceWeights | null {
  const { thickness, dimensions, dimensionKind, region, plateType } = item
  if (thickness === null || !dimensionKind || !plateType) {
    return null
  }
  // 材質を選ぶ種類では、材質がそろってから計算する（入力の途中で重量を出さないため）
  if (item.needsMaterial && !item.materialId) {
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
      // 寸法切は角重量と実重量が同じ。アイトレの実重量は送り状発行の画面で入力する。
      // 切断区分は、通常の切断と、スプライス専用の受注の明細（特殊製品の切断区分）の両方を見る
      const cuttingType =
        region?.kind === 'cut' || region?.kind === 'special' ? region.cuttingType : null
      const isDimensionCut = cuttingType === '寸法切'
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

// 行の重量（1 枚あたりの重量と合計重量）。寸法・数量などがそろっていなければ null
export function calculateItemWeight(item: ResolvedItem): ItemWeight | null {
  const weights = calculatePieceWeights(item)
  if (!weights || item.quantity === null) {
    return null
  }
  return { weights, totalWeight: calcTotalWeight(weights.displayWeight, item.quantity) }
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
      // スプライス専用の受注でショットの有無が未選択なら、単価を引けない。
      // 切断区分（寸法切 / アイトレ）は条件に含めない（特殊製品単価は切断区分で分かれておらず、
      // アイトレの別途見積もりは取得した後に lib/pricing で判定する）。
      // そのため、スプライスの寸法切とアイトレは同じ条件になり、取得結果も同じになる
      if (item.hasShot === null) {
        return null
      }
      return { ...base, specialProductTypeId: region.type.id, hasShot: item.hasShot }
    case 'standard':
      return item.plateSize ? { ...base, plateSize: item.plateSize } : null
    case 'process':
      return null
  }
}

// 価格マスタの行を取得する条件が作れない理由（「未確定」の欄に添える）。
// pricingConditionsOf が null を返す場合の、画面に出す説明
function missingPricingReason(item: ResolvedItem, asOf: string): string {
  if (!asOf) {
    return '受注日が未入力のため単価を計算できません'
  }
  if (item.region?.kind === 'special' && item.hasShot === null) {
    return 'ショットが未入力のため単価を計算できません'
  }
  if (item.region?.kind === 'cut' && !item.cuttingMethod) {
    return '切断方法が未入力のため単価を計算できません'
  }
  return '入力がそろっていないため単価を計算できません'
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
// pricingMasters は get_pricing_rows で取得した行（未取得・取得失敗なら undefined）。
// 重量は単価の状態に関係なく、寸法などがそろえば返す
export function calculateItem(
  item: ResolvedItem,
  pricingMasters: PricingMasters | undefined,
  asOf: string,
): ItemCalculation {
  const weight = calculateItemWeight(item)
  if (!weight) {
    return { weight: null, price: { status: 'incomplete' } }
  }
  return { weight, price: calculateItemPrice(item, weight, pricingMasters, asOf) }
}

// 仕入単価・仕入金額を求める（重量が出ている行だけ）
function calculateItemPrice(
  item: ResolvedItem,
  weight: ItemWeight,
  pricingMasters: PricingMasters | undefined,
  asOf: string,
): ItemPrice {
  const { weights } = weight
  const { region, plateType, thickness, quantity, productSelection } = item
  // 重量が出ている行は、区分・種類・板厚・数量がそろっている（calculateItemWeight で確認済み）
  if (!region || !plateType || thickness === null || quantity === null) {
    return { status: 'incomplete' }
  }
  // 加工の行は材料の単価を持たない（加工の仕入金額は process-row.ts で求める）
  if (region.kind === 'process') {
    return { status: 'incomplete' }
  }

  const conditions = pricingConditionsOf(item, asOf)
  if (!conditions) {
    return { status: 'undetermined', reason: missingPricingReason(item, asOf) }
  }
  // 種類・材質・板厚の商品がない（取り扱いのない板厚）。確認（validate-order-items）でもエラーになる
  if (!productSelection?.ok) {
    return { status: 'undetermined', reason: '取り扱いのない板厚のため単価を計算できません' }
  }
  if (!pricingMasters) {
    return { status: 'loading' }
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
      return { status: 'quote', reason: result.reason }
    }
    return {
      status: 'priced',
      unitPrice: result.kgUnitPrice,
      priceUnit: 'kg',
      amount: result.amount,
    }
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
            // スプライス専用の受注は切断区分（寸法切 / アイトレ）を渡す。アイトレは別途見積もりになる
            // （special_product_types.irregular_cut_quote_required）。ほかの特殊製品は null
            cuttingType: region.cuttingType,
            // スプライスのショット加工の有無（ヘッダーの値）。pricingConditionsOf で null でないことを確認済み
            hasShot: item.hasShot ?? false,
            steelMaking,
            asOf,
            squareWeight: weights.squareWeight,
            actualWeight: weights.actualWeight,
            materialWeight: weights.materialWeight,
          },
          pricingMasters,
        )

  if (price.status === 'quote') {
    return { status: 'quote', reason: price.reason }
  }
  return {
    status: 'priced',
    unitPrice: price.unitPrice,
    priceUnit: price.priceUnit,
    amount: calcAmount(price, quantity),
  }
}
