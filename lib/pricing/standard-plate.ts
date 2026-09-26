// 定尺売り（切断を伴わない、定尺サイズのままの販売）の単価・金額の計算。
//
//   金額 = 定尺単価（kg単価）× 合計重量（定尺1枚の重量 × 枚数）
//
// 定尺売りは切断の手間がないため、最低保証重量は適用しない。
// 切断単価と違い、材質エキストラ・板厚エキストラなどの加算もない
// （standard_plate_prices に材質・板厚・サイズごとの単価をそのまま持っている）。

import { calcAmount } from './amount'
import { pickLatestValid } from './master-lookup'
import type { PlateSize, PlateTypeRow, PricingMasters } from './types'
import { calcRectangleWeight, calcTotalWeight } from './weight'

// 定尺サイズ（フィート表記）ごとの寸法（mm）
export const PLATE_SIZE_DIMENSIONS: Record<PlateSize, { width: number; length: number }> = {
  '3x6': { width: 914, length: 1829 },
  '4x8': { width: 1219, length: 2438 },
  '5x10': { width: 1524, length: 3048 },
}

export type StandardPlatePriceInput = {
  plateType: PlateTypeRow
  // 無規格（ボンデ・ミガキ）は null
  materialId: string | null
  thickness: number
  plateSize: PlateSize
  quantity: number
  // 縞板の単位質量（kg/m²）。縞板以外は省略する
  unitWeight?: number | null
  // 単価の基準日（受注日）。'YYYY-MM-DD'
  asOf: string
}

export type StandardPlatePriceResult =
  | {
      status: 'priced'
      kgUnitPrice: number
      // 定尺1枚の重量（丸める前の値）
      pieceWeight: number
      // 合計重量（小数第2位までに四捨五入）
      totalWeight: number
      // 金額（円未満切り上げ）
      amount: number
    }
  | { status: 'quote'; reason: string }

export function calculateStandardPlatePrice(
  input: StandardPlatePriceInput,
  masters: Pick<PricingMasters, 'standardPlatePrices'>,
): StandardPlatePriceResult {
  // 種類・材質・板厚・サイズが一致する行を探す（材質は無規格の NULL 同士も一致として扱う）
  const priceRow = pickLatestValid(
    masters.standardPlatePrices.filter(
      (row) =>
        row.plate_type_id === input.plateType.id &&
        row.material_id === input.materialId &&
        row.thickness === input.thickness &&
        row.plate_size === input.plateSize,
    ),
    input.asOf,
  )
  if (!priceRow) {
    return { status: 'quote', reason: '該当する定尺単価が登録されていないため別途見積もり' }
  }

  // 定尺1枚の重量は、切断品と同じ角の式で求める（縞板は単位質量を使う）
  const { width, length } = PLATE_SIZE_DIMENSIONS[input.plateSize]
  const pieceWeight = calcRectangleWeight({
    thickness: input.thickness,
    width,
    length,
    unitWeight: input.unitWeight,
  })

  return {
    status: 'priced',
    kgUnitPrice: priceRow.unit_price,
    pieceWeight,
    totalWeight: calcTotalWeight(pieceWeight, input.quantity),
    // 保証重量は適用しないため、1枚あたりの重量をそのまま kg単価の金額計算に使う
    amount: calcAmount(
      { priceUnit: 'kg', unitPrice: priceRow.unit_price, billingWeight: pieceWeight },
      input.quantity,
    ),
  }
}
