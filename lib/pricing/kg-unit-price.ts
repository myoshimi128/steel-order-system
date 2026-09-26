// kg単価の計算（保証重量を掛ける前の、エキストラをすべて加算した kg単価）。
//
// 単価は積み上げで求める（docs/basic-design.md「切断単価の自動計算」）。
//   kg単価 = 切断単価（または特殊製品単価）
//          + 材質エキストラ（SS400ベースの行を使い、種類が材質エキストラを適用する場合のみ）
//          + 高炉材加算（受注が高炉材の場合）
//          + 板厚エキストラ
//          + 大板加算（大板の場合）
//
// 例外（SS400 には高炉材加算がない、など）はマスタの値として持っているため、
// ここでは材質名・種類名による条件分岐は書かない。

import { inThicknessRange, pickLatestValid } from './master-lookup'
import { roundTo } from './rounding'
import type {
  CuttingMethod,
  CuttingPriceRow,
  CuttingType,
  KgUnitPriceBreakdown,
  KgUnitPriceResult,
  MaterialExtraRow,
  PlateTypeRow,
  PricingMasters,
  Shape,
  SpecialProductTypeRow,
  SteelMaking,
  ThicknessExtraRow,
} from './types'

// ------------------------------------------------------------
// 共通のヘルパー
// ------------------------------------------------------------

// 板厚ごとの加算値（板厚エキストラ・大板加算）を引く。登録がなければ 0
function findThicknessExtra(rows: ThicknessExtraRow[], thickness: number): number {
  return rows.find((row) => row.thickness === thickness)?.extra_price ?? 0
}

// 材質エキストラ・高炉材加算を求める。
// 材質の行が必要なのに登録されていない場合は、誤った単価を出さないよう null を返す。
function resolveMaterialExtras(input: {
  materialId: string | null
  steelMaking: SteelMaking
  // 材質エキストラを加算するか（SS400ベースの行を使い、種類が材質エキストラを適用する場合）
  addMaterialExtra: boolean
  materialExtras: MaterialExtraRow[]
}): { materialExtra: number; blastFurnaceExtra: number } | null {
  const { materialId, steelMaking, addMaterialExtra, materialExtras } = input
  const needsBlastFurnace = steelMaking === '高炉材'

  // 材質を持たない（ボンデ・ミガキ）か、どちらの加算も不要なら 0
  if (materialId === null || (!addMaterialExtra && !needsBlastFurnace)) {
    return { materialExtra: 0, blastFurnaceExtra: 0 }
  }

  const extraRow = materialExtras.find((row) => row.material_id === materialId)
  if (!extraRow) {
    return null
  }
  return {
    materialExtra: addMaterialExtra ? extraRow.extra_price : 0,
    blastFurnaceExtra: needsBlastFurnace ? extraRow.blast_furnace_extra : 0,
  }
}

// 内訳を合計して kg単価にする（浮動小数点の誤差を小数第2位で取り除く）
function sumBreakdown(breakdown: KgUnitPriceBreakdown): number {
  return roundTo(
    breakdown.basePrice +
      breakdown.materialExtra +
      breakdown.blastFurnaceExtra +
      breakdown.thicknessExtra +
      breakdown.largePlateExtra,
    2,
  )
}

// ------------------------------------------------------------
// 切断単価
// ------------------------------------------------------------

export type CuttingKgUnitPriceInput = {
  plateType: PlateTypeRow
  // 無規格（ボンデ・ミガキ）は null
  materialId: string | null
  thickness: number
  shape: Shape
  cuttingMethod: CuttingMethod
  cuttingType: CuttingType
  steelMaking: SteelMaking
  // 単価の基準日（受注日）。'YYYY-MM-DD'
  asOf: string
}

export function findCuttingKgUnitPrice(
  input: CuttingKgUnitPriceInput,
  masters: Pick<
    PricingMasters,
    'cuttingPrices' | 'materialExtras' | 'thicknessExtras' | 'largePlateExtras'
  >,
): KgUnitPriceResult {
  // 種類・切断方法・切断区分・板厚が一致する行に絞り込む
  const candidates = masters.cuttingPrices.filter(
    (row) =>
      row.plate_type_id === input.plateType.id &&
      row.cutting_method === input.cuttingMethod &&
      row.cutting_type === input.cuttingType &&
      inThicknessRange(row, input.thickness),
  )

  // まず材質指定（専用単価）の行を探し、なければ SS400ベース（material_id が NULL）の行を使う
  const dedicatedRow =
    input.materialId === null
      ? undefined
      : pickLatestValid(
          candidates.filter((row) => row.material_id === input.materialId),
          input.asOf,
        )
  const priceRow: CuttingPriceRow | undefined =
    dedicatedRow ??
    pickLatestValid(
      candidates.filter((row) => row.material_id === null),
      input.asOf,
    )

  if (!priceRow) {
    return { status: 'quote', reason: '該当する切断単価が登録されていないため別途見積もり' }
  }
  if (priceRow.unit_price === null) {
    return { status: 'quote', reason: '切断単価が「別途」のため別途見積もり' }
  }

  const usedDedicatedPrice = dedicatedRow !== undefined
  const extras = resolveMaterialExtras({
    materialId: input.materialId,
    steelMaking: input.steelMaking,
    // 専用単価には材質差が織り込まれているため、材質エキストラは SS400ベースの行のときだけ加算する
    addMaterialExtra: !usedDedicatedPrice && input.plateType.applies_material_extra,
    materialExtras: masters.materialExtras,
  })
  if (!extras) {
    return { status: 'quote', reason: '材質エキストラが登録されていないため別途見積もり' }
  }

  const breakdown: KgUnitPriceBreakdown = {
    basePrice: priceRow.unit_price,
    materialExtra: extras.materialExtra,
    blastFurnaceExtra: extras.blastFurnaceExtra,
    thicknessExtra: findThicknessExtra(masters.thicknessExtras, input.thickness),
    largePlateExtra:
      input.shape === '大板' ? findThicknessExtra(masters.largePlateExtras, input.thickness) : 0,
    usedDedicatedPrice,
  }

  return {
    status: 'priced',
    kgUnitPrice: sumBreakdown(breakdown),
    // 最低保証重量の段は、使った切断単価の行のフラグに従う
    rule: {
      hasLightTier: priceRow.has_light_tier,
      minWeight: null,
      smallPieceQuoteRequired: priceRow.small_piece_quote_required,
      alwaysPiecePrice: false,
    },
    breakdown,
  }
}

// ------------------------------------------------------------
// 特殊製品単価（スプライス・ササラ・ベタ丸・ドーナツ）
// ------------------------------------------------------------

export type SpecialProductKgUnitPriceInput = {
  specialProductType: SpecialProductTypeRow
  plateType: PlateTypeRow
  materialId: string | null
  thickness: number
  shape: Shape
  // 切断区分（寸法切 / アイトレ）。未指定は null
  cuttingType: CuttingType | null
  // ショット加工の有無（スプライスのみ使用）
  hasShot?: boolean
  steelMaking: SteelMaking
  asOf: string
}

export function findSpecialProductKgUnitPrice(
  input: SpecialProductKgUnitPriceInput,
  masters: Pick<
    PricingMasters,
    'specialProductPrices' | 'materialExtras' | 'thicknessExtras' | 'largePlateExtras'
  >,
): KgUnitPriceResult {
  const type = input.specialProductType

  // 寸法切を前提とした単価の種別（スプライス）は、アイトレなら別途見積もり
  if (type.irregular_cut_quote_required && input.cuttingType === 'アイトレ') {
    return { status: 'quote', reason: 'アイトレのため別途見積もり' }
  }

  const priceRow = pickLatestValid(
    masters.specialProductPrices.filter(
      (row) =>
        row.special_product_type_id === type.id &&
        row.plate_type_id === input.plateType.id &&
        row.has_shot === (input.hasShot ?? false) &&
        inThicknessRange(row, input.thickness),
    ),
    input.asOf,
  )

  // 登録のない板厚・種類（スプライス・ササラの 28mm 以上など）は別途見積もり
  if (!priceRow) {
    return { status: 'quote', reason: '該当する特殊製品単価が登録されていないため別途見積もり' }
  }

  // 特殊製品は材質を問わない単価のため、材質エキストラは種類が適用する場合に常に加算する
  const extras = resolveMaterialExtras({
    materialId: input.materialId,
    steelMaking: input.steelMaking,
    addMaterialExtra: input.plateType.applies_material_extra,
    materialExtras: masters.materialExtras,
  })
  if (!extras) {
    return { status: 'quote', reason: '材質エキストラが登録されていないため別途見積もり' }
  }

  // 板厚エキストラ・大板加算は、特殊製品種別のフラグに従う
  const breakdown: KgUnitPriceBreakdown = {
    basePrice: priceRow.unit_price,
    materialExtra: extras.materialExtra,
    blastFurnaceExtra: extras.blastFurnaceExtra,
    thicknessExtra: type.applies_thickness_extra
      ? findThicknessExtra(masters.thicknessExtras, input.thickness)
      : 0,
    largePlateExtra:
      type.applies_large_plate_extra && input.shape === '大板'
        ? findThicknessExtra(masters.largePlateExtras, input.thickness)
        : 0,
    usedDedicatedPrice: false,
  }

  return {
    status: 'priced',
    kgUnitPrice: sumBreakdown(breakdown),
    rule: {
      hasLightTier: type.has_light_tier,
      minWeight: type.min_weight,
      smallPieceQuoteRequired: false,
      alwaysPiecePrice: type.always_piece_price,
    },
    breakdown,
  }
}
