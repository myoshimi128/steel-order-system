// 明細（材料の行）の入力値を解釈する処理。
//
//   ・番号から切断方法・区分・種類・材質・製鋼法・メーカーを引く
//   ・板厚・寸法・数量を数値にする
//   ・定尺・大板を判定し、商品（products）を特定する
//   ・縞板の単位質量を引く
//
// 画面（表示・入力順）・確認（validate-order-items.ts）・計算（calculate-item.ts）・保存（Server Action）の
// すべてがこの解釈結果を使う。画面や DB に依存しない純粋な関数にして、テストで確認できるようにしている。

import { findCodeOption } from '@/lib/code-input/code-option'
import {
  CUTTING_METHOD_OPTIONS,
  PLATE_SIZE_OPTIONS,
  STANDARD_PLATE_LENGTH,
  STANDARD_PLATE_WIDTH,
  STEEL_MAKING_OPTIONS,
  type CuttingMethodChoice,
  type PlateSizeValue,
  type SteelMakingValue,
} from './constants'
import {
  dimensionKindOf,
  manufacturerOptionsFor,
  materialOptionsFor,
  requiresManufacturer,
  resolveRegion,
} from './item-options'
import type {
  DimensionKind,
  ItemContext,
  ItemMasters,
  ItemRowValues,
  PlateTypeMaster,
  ProductMaster,
  Region,
} from './item-types'

// ------------------------------------------------------------
// 数値の読み取り
// ------------------------------------------------------------

// 正の数（板厚・寸法）として読み取る。空欄・数値でない・0 以下は null
export function parsePositiveNumber(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed || !/^\d+(\.\d+)?$/.test(trimmed)) {
    return null
  }
  const value = Number(trimmed)
  return value > 0 ? value : null
}

// 数量（1 以上の整数）として読み取る。それ以外は null
export function parseQuantity(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const value = Number(trimmed)
  return value >= 1 ? value : null
}

// ------------------------------------------------------------
// 定尺・大板の判定（docs/basic-design.md「定尺と大板の判定」）
// ------------------------------------------------------------

// 部品の寸法が定尺（1524 × 3048）に収まるか。縦横を入れ替えて収まる場合も「収まる」とする
export function fitsInStandardPlate(width: number, length: number): boolean {
  return (
    (width <= STANDARD_PLATE_WIDTH && length <= STANDARD_PLATE_LENGTH) ||
    (length <= STANDARD_PLATE_WIDTH && width <= STANDARD_PLATE_LENGTH)
  )
}

export type ItemDimensions = {
  width: number | null
  length: number | null
  outerDiameter: number | null
  innerDiameter: number | null
}

// 部品の外形（外接する四角形）。円・ドーナツは外径を縦横とする。寸法がそろっていなければ null
export function pieceBoundingBox(
  kind: DimensionKind | null,
  dimensions: ItemDimensions,
): { width: number; length: number } | null {
  if (kind === 'rectangle') {
    return dimensions.width !== null && dimensions.length !== null
      ? { width: dimensions.width, length: dimensions.length }
      : null
  }
  if (kind === 'circle' || kind === 'donut') {
    return dimensions.outerDiameter !== null
      ? { width: dimensions.outerDiameter, length: dimensions.outerDiameter }
      : null
  }
  return null
}

export type ProductSelection =
  | {
      ok: true
      product: ProductMaster
      // 単価計算に渡す形状。大板加算は、部品が定尺を超える場合だけかける
      pricingShape: '定尺' | '大板'
    }
  | { ok: false }

// 商品を特定する。
//   ・部品が定尺に収まる場合: 定尺の商品があれば定尺、なければ大板の商品を使う
//     （厚板のように大板の商品しかない板厚は、小さな部品でも大板の商品を使う）
//   ・部品が定尺を超える場合: 大板の商品を使う
//   ・大板加算（pricingShape = '大板'）は、部品が定尺を超える場合だけ
//   ・定尺売り（isStandardSale）は定尺の商品だけを使う
export function selectProduct(params: {
  products: readonly ProductMaster[]
  plateTypeId: string
  materialId: string | null
  thickness: number
  exceedsStandard: boolean
  isStandardSale: boolean
}): ProductSelection {
  const candidates = params.products.filter(
    (product) =>
      product.plate_type_id === params.plateTypeId &&
      product.material_id === params.materialId &&
      product.thickness === params.thickness,
  )
  const standard = candidates.find((product) => product.shape === '定尺')
  const large = candidates.find((product) => product.shape === '大板')

  if (params.isStandardSale) {
    return standard ? { ok: true, product: standard, pricingShape: '定尺' } : { ok: false }
  }
  if (params.exceedsStandard) {
    return large ? { ok: true, product: large, pricingShape: '大板' } : { ok: false }
  }
  const product = standard ?? large
  return product ? { ok: true, product, pricingShape: '定尺' } : { ok: false }
}

// その種類・材質・板厚の商品が 1 つでもあるか（寸法を入れる前の、板厚の時点での警告に使う）
export function hasAnyProduct(params: {
  products: readonly ProductMaster[]
  plateTypeId: string
  materialId: string | null
  thickness: number
}): boolean {
  return params.products.some(
    (product) =>
      product.plate_type_id === params.plateTypeId &&
      product.material_id === params.materialId &&
      product.thickness === params.thickness,
  )
}

// ------------------------------------------------------------
// 行の解釈
// ------------------------------------------------------------

export type ResolvedItem = {
  cuttingMethod: CuttingMethodChoice | null
  region: Region | null
  dimensionKind: DimensionKind | null
  plateType: PlateTypeMaster | null
  // 材質を選ぶ種類か（選択肢がない種類 = 無規格のボンデ・ミガキは false）
  needsMaterial: boolean
  materialId: string | null
  // 製鋼法を入力する行か（定尺、または材質エキストラを適用しない種類では入力しない）
  steelMakingApplicable: boolean
  steelMaking: SteelMakingValue | null
  // メーカーの指定が必須の行か（縞板）
  needsManufacturer: boolean
  // 番号が選択肢にあるか（「0 指定なし」も有効）
  manufacturerValid: boolean
  manufacturerId: string | null
  thickness: number | null
  dimensions: ItemDimensions
  plateSize: PlateSizeValue | null
  quantity: number | null
  // 部品が定尺を超えるか（寸法がそろっていなければ null）
  exceedsStandard: boolean | null
  // 商品の特定結果（種類・板厚・寸法がそろっていなければ null）
  productSelection: ProductSelection | null
  // 縞板の単位質量（kg/m²）。メーカー・板厚がそろっていて登録があれば値が入る
  unitWeight: number | null
  // スプライスのショット加工の有無（スプライス専用の受注のヘッダーの値。それ以外の行は false）。
  // スプライス専用の受注でショットが未選択なら null（単価を計算できない）
  hasShot: boolean | null
}

// 通常の受注（スプライス専用の受注でない）の設定。引数を省略したときに使う
export const NORMAL_ORDER_CONTEXT: ItemContext = { isSplice: false, spliceShot: null }

export function resolveItemRow(
  row: ItemRowValues,
  masters: ItemMasters,
  context: ItemContext = NORMAL_ORDER_CONTEXT,
): ResolvedItem {
  const cuttingMethod = findCodeOption(CUTTING_METHOD_OPTIONS, row.cuttingMethod)?.value ?? null
  // スプライス専用の受注では、区分の欄は切断区分（1 寸法切 / 2 アイトレ）と 9 加工
  const region = resolveRegion(row.region, masters, context.isSplice)
  // ショットの有無はスプライス受注用の種別の行だけで使う（ほかの特殊製品の単価はショットなしの行）
  const isSpliceRow = region?.kind === 'special' && region.type.is_splice_order_type
  const hasShot = isSpliceRow ? context.spliceShot : false
  const dimensionKind = dimensionKindOf(region)

  const plateType =
    masters.plateTypes.find((type) => String(type.number) === row.plateType.trim()) ?? null

  // 材質: 選んだ種類に材質の選択肢があるときだけ使う
  const materialOptions = materialOptionsFor(plateType?.id ?? null, masters)
  const needsMaterial = materialOptions.length > 0
  const materialId = needsMaterial
    ? (findCodeOption(materialOptions, row.material)?.value ?? null)
    : null

  // 製鋼法: 定尺売り、または材質エキストラを適用しない種類（縞板・ボンデ・ミガキ）では入力しない
  const steelMakingApplicable =
    region?.kind !== 'standard' && (plateType?.applies_material_extra ?? true)
  const steelMaking = steelMakingApplicable
    ? (findCodeOption(STEEL_MAKING_OPTIONS, row.steelMaking)?.value ?? null)
    : null

  // メーカー
  const needsManufacturer = requiresManufacturer(plateType?.id ?? null, masters)
  const manufacturerOption = findCodeOption(
    manufacturerOptionsFor(plateType?.id ?? null, masters),
    row.manufacturer,
  )
  const manufacturerId = manufacturerOption?.value ?? null

  const thickness = parsePositiveNumber(row.thickness)
  const dimensions: ItemDimensions = {
    width: parsePositiveNumber(row.width),
    length: parsePositiveNumber(row.length),
    outerDiameter: parsePositiveNumber(row.outerDiameter),
    innerDiameter: parsePositiveNumber(row.innerDiameter),
  }
  const plateSize = findCodeOption(PLATE_SIZE_OPTIONS, row.plateSize)?.value ?? null

  // 定尺・大板の判定と商品の特定
  const isStandardSale = region?.kind === 'standard'
  const box = pieceBoundingBox(dimensionKind, dimensions)
  const exceedsStandard = isStandardSale ? false : box ? !fitsInStandardPlate(box.width, box.length) : null
  const productSelection =
    plateType && thickness !== null && (!needsMaterial || materialId) && exceedsStandard !== null
      ? selectProduct({
          products: masters.products,
          plateTypeId: plateType.id,
          materialId,
          thickness,
          exceedsStandard,
          isStandardSale,
        })
      : null

  // 縞板の単位質量（メーカー × 板厚）
  const unitWeight =
    needsManufacturer && plateType && manufacturerId && thickness !== null
      ? (masters.unitWeights.find(
          (row) =>
            row.plate_type_id === plateType.id &&
            row.manufacturer_id === manufacturerId &&
            row.thickness === thickness,
        )?.unit_weight ?? null)
      : null

  return {
    cuttingMethod,
    region,
    dimensionKind,
    plateType,
    needsMaterial,
    materialId,
    steelMakingApplicable,
    steelMaking,
    needsManufacturer,
    manufacturerValid: manufacturerOption !== undefined,
    manufacturerId,
    thickness,
    dimensions,
    plateSize,
    quantity: parseQuantity(row.quantity),
    exceedsStandard,
    productSelection,
    unitWeight,
    hasShot,
  }
}

// 何も入力していない行か（保存の対象から外す）。
// 初期値のある欄（種類・製鋼法・メーカー）は、初期値のままなら未入力とみなす
export function isBlankRow(row: ItemRowValues, initial: ItemRowValues): boolean {
  const fields = Object.keys(initial).filter((key) => key !== 'key') as (keyof ItemRowValues)[]
  return fields.every((field) => row[field].trim() === initial[field].trim())
}
