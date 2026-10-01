// 明細（材料の行）の番号の欄の選択肢を作る処理。
//
// 固定の選択肢（切断方法など）は constants.ts の定数、マスタの選択肢はマスタの番号・コードから作る。
// 種類によって材質・メーカーの選択肢を絞り込む（docs/screen-design.md「種類・材質・製鋼法」「メーカー」）。

import { findCodeOption, sortByCode, type CodeOption } from '@/lib/code-input/code-option'
import { FIXED_REGION_OPTIONS, NO_MANUFACTURER_CODE, SPLICE_REGION_OPTIONS } from './constants'
import type { DimensionKind, ItemMasters, Region } from './item-types'

// 区分の選択肢。
//   通常の受注        : 固定の区分（1 寸法切 / 2 アイトレ / 3 定尺 / 9 加工）に、
//                       特殊製品種別（ササラ・ベタ丸・ドーナツ）を番号で加える。
//                       スプライス受注用の種別（is_splice_order_type）は出さない
//   スプライス専用の受注: 切断区分（1 寸法切 / 2 アイトレ）と 9 加工
// 選択肢の値は表示用の名称にしている（解釈は resolveRegion で行う）
export function regionOptions(masters: ItemMasters, isSplice = false): CodeOption<string>[] {
  if (isSplice) {
    return SPLICE_REGION_OPTIONS.map((option) => ({ ...option, value: option.value as string }))
  }
  const specialOptions = masters.specialProductTypes
    .filter((type) => !type.is_splice_order_type)
    .map((type) => ({ code: String(type.number), label: type.name, value: type.id }))
  return sortByCode([
    ...FIXED_REGION_OPTIONS.map((option) => ({ ...option, value: option.value as string })),
    ...specialOptions,
  ])
}

// スプライス専用の受注の明細に使う特殊製品種別（is_splice_order_type が true の種別）
export function spliceOrderType(masters: ItemMasters) {
  return masters.specialProductTypes.find((type) => type.is_splice_order_type) ?? null
}

// 加工方法の選択肢（番号＝process_types.number、値＝id）。番号が未設定の加工種別は出さない
export function processTypeOptions(masters: ItemMasters): CodeOption<string>[] {
  return sortByCode(
    masters.processTypes
      .filter((type) => type.number !== null)
      .map((type) => ({ code: String(type.number), label: type.name, value: type.id })),
  )
}

// 区分の番号を解釈する。見つからなければ null。
// スプライス専用の受注では、1 寸法切 / 2 アイトレ をスプライス（切断区分つき）として、9 を加工として解釈する
export function resolveRegion(code: string, masters: ItemMasters, isSplice = false): Region | null {
  if (isSplice) {
    const splice = findCodeOption(SPLICE_REGION_OPTIONS, code)
    if (!splice) {
      return null
    }
    if (splice.value === '加工') {
      return { kind: 'process' }
    }
    const type = spliceOrderType(masters)
    return type && (splice.value === '寸法切' || splice.value === 'アイトレ')
      ? { kind: 'special', type, cuttingType: splice.value }
      : null
  }

  const fixed = findCodeOption(FIXED_REGION_OPTIONS, code)
  if (fixed) {
    switch (fixed.value) {
      case '寸法切':
      case 'アイトレ':
        return { kind: 'cut', cuttingType: fixed.value }
      case '定尺':
        return { kind: 'standard' }
      case '加工':
        return { kind: 'process' }
    }
  }
  const trimmed = code.trim()
  const special = masters.specialProductTypes.find(
    (type) => !type.is_splice_order_type && String(type.number) === trimmed,
  )
  return special ? { kind: 'special', type: special, cuttingType: null } : null
}

// 区分に応じた寸法の入力欄の種類。特殊製品は種別の dimension_shape で決まる
export function dimensionKindOf(region: Region | null): DimensionKind | null {
  if (!region) {
    return null
  }
  switch (region.kind) {
    case 'cut':
      return 'rectangle'
    case 'standard':
      return 'plateSize'
    case 'process':
      return null
    case 'special':
      if (region.type.dimension_shape === '円') {
        return 'circle'
      }
      if (region.type.dimension_shape === 'ドーナツ') {
        return 'donut'
      }
      return 'rectangle'
  }
}

// 種類の選択肢（番号＝plate_types.number、値＝id）
export function plateTypeOptions(masters: ItemMasters): CodeOption<string>[] {
  return sortByCode(
    masters.plateTypes.map((type) => ({ code: String(type.number), label: type.name, value: type.id })),
  )
}

// 材質の選択肢。選んだ種類について商品マスタに登録されている材質だけに絞る
// （例: 縞板は SS400 のみ、ボンデ・ミガキは材質なしのため空）
export function materialOptionsFor(
  plateTypeId: string | null,
  masters: ItemMasters,
): CodeOption<string>[] {
  if (!plateTypeId) {
    return []
  }
  const materialIds = new Set(
    masters.products
      .filter((product) => product.plate_type_id === plateTypeId && product.material_id !== null)
      .map((product) => product.material_id as string),
  )
  return sortByCode(
    masters.materials
      .filter((material) => materialIds.has(material.id))
      .map((material) => ({ code: String(material.number), label: material.name, value: material.id })),
  )
}

// メーカーの指定が必須の種類か。
// 単位質量（unit_weights）が登録されている種類（縞板）は、重量の計算にメーカーの単位質量が必要なため必須にする。
// 種類名で分岐せず、単位質量の登録の有無で判定する
export function requiresManufacturer(plateTypeId: string | null, masters: ItemMasters): boolean {
  return plateTypeId !== null && masters.unitWeights.some((row) => row.plate_type_id === plateTypeId)
}

// メーカーの選択肢。
//   メーカーが必須の種類: 単位質量が 1 件でも登録されているメーカーだけ（「0 指定なし」は出さない）
//   それ以外           : 「0 指定なし」＋ 全メーカー
// 値は manufacturers.id（指定なしは null）
export function manufacturerOptionsFor(
  plateTypeId: string | null,
  masters: ItemMasters,
): CodeOption<string | null>[] {
  const all = masters.manufacturers.map((manufacturer) => ({
    code: manufacturer.code,
    label: manufacturer.name,
    value: manufacturer.id as string | null,
  }))
  if (requiresManufacturer(plateTypeId, masters)) {
    const ids = new Set(
      masters.unitWeights
        .filter((row) => row.plate_type_id === plateTypeId)
        .map((row) => row.manufacturer_id),
    )
    return sortByCode(all.filter((option) => ids.has(option.value as string)))
  }
  return [{ code: NO_MANUFACTURER_CODE, label: '指定なし', value: null }, ...sortByCode(all)]
}
