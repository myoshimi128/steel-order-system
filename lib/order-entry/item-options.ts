// 明細（材料の行）の番号の欄の選択肢を作る処理。
//
// 固定の選択肢（切断方法など）は constants.ts の定数、マスタの選択肢はマスタの番号・コードから作る。
// 種類によって材質・メーカーの選択肢を絞り込む（docs/screen-design.md「種類・材質・製鋼法」「メーカー」）。

import { sortByCode, type CodeOption } from '@/lib/code-input/code-option'
import {
  CUT_TYPE_DIGITS,
  CUTTING_METHOD_DIGITS,
  NO_MANUFACTURER_CODE,
  PROCESS_REGION_CODE,
  SHEARING_IRREGULAR_CUT_LABEL,
  STANDARD_CUT_REGION_CODE,
  type CuttingMethodChoice,
  type CuttingMethodDigit,
} from './constants'
import type { DimensionKind, ItemMasters, Region } from './item-types'

// スプライス専用の受注の明細に使う特殊製品種別（is_splice_order_type が true の種別）
export function spliceOrderType(masters: ItemMasters) {
  return masters.specialProductTypes.find((type) => type.is_splice_order_type) ?? null
}

// ------------------------------------------------------------
// 切断・区分（切断方法と区分をまとめた 2 桁の番号）
// ------------------------------------------------------------

// 切断・区分の番号 1 つ分。番号と、表に出す名前と、解釈した切断方法・区分
export type CutRegionEntry = {
  code: string
  label: string
  // 切断方法（9 加工は null、71 定尺は '定尺'）
  cuttingMethod: CuttingMethodChoice | null
  region: Region
}

// 寸法切・アイトレの表示名。シャーリングのアイトレは「型切り」と表示する（保存する値はアイトレ）
function cutTypeLabel(method: CuttingMethodDigit, cutType: '寸法切' | 'アイトレ'): string {
  if (cutType === 'アイトレ' && method.value === 'シャーリング') {
    return SHEARING_IRREGULAR_CUT_LABEL
  }
  return cutType
}

// 切断・区分の番号の一覧を作る（docs/screen-design.md「切断・区分の番号」）。
//   通常の受注        : 寸法切・アイトレ（シャーは型切り）、特殊製品（ガス・プラズマ・レーザー × 特殊製品種別）、
//                       71 定尺、9 加工。スプライス受注用の種別（is_splice_order_type）は出さない
//   スプライス専用の受注: 寸法切・アイトレ（明細はすべてスプライス）と 9 加工。定尺・特殊製品は使えない
// 特殊製品の番号は「切断方法の数字＋特殊製品種別マスタの番号」で組み立てる（種別名では分岐しない）
export function cutRegionEntries(masters: ItemMasters, isSplice = false): CutRegionEntry[] {
  const entries: CutRegionEntry[] = []
  const splice = isSplice ? spliceOrderType(masters) : null

  for (const method of CUTTING_METHOD_DIGITS) {
    for (const cutType of ['寸法切', 'アイトレ'] as const) {
      const code = `${method.digit}${CUT_TYPE_DIGITS[cutType]}`
      const label = `${method.short}${cutTypeLabel(method, cutType)}`
      if (isSplice) {
        // スプライスの種別が登録されていなければ、スプライス専用の受注の明細は解釈できない
        if (splice) {
          entries.push({
            code,
            label,
            cuttingMethod: method.value,
            region: { kind: 'special', type: splice, cuttingType: cutType },
          })
        }
      } else {
        entries.push({ code, label, cuttingMethod: method.value, region: { kind: 'cut', cuttingType: cutType } })
      }
    }

    if (!isSplice && method.makesSpecialProducts) {
      for (const type of masters.specialProductTypes) {
        if (type.is_splice_order_type) {
          continue
        }
        entries.push({
          code: `${method.digit}${type.number}`,
          label: `${method.short}${type.name}`,
          cuttingMethod: method.value,
          region: { kind: 'special', type, cuttingType: null },
        })
      }
    }
  }

  if (!isSplice) {
    entries.push({
      code: STANDARD_CUT_REGION_CODE,
      label: '定尺',
      cuttingMethod: '定尺',
      region: { kind: 'standard' },
    })
  }
  entries.push({ code: PROCESS_REGION_CODE, label: '加工', cuttingMethod: null, region: { kind: 'process' } })
  return entries
}

// 切断・区分の選択肢（「/」の一覧と、番号から名前を引くのに使う）。値は番号そのもの
export function cutRegionOptions(masters: ItemMasters, isSplice = false): CodeOption<string>[] {
  return sortByCode(
    cutRegionEntries(masters, isSplice).map((entry) => ({
      code: entry.code,
      label: entry.label,
      value: entry.code,
    })),
  )
}

// 切断・区分の番号を解釈する。見つからなければ null
export function resolveCutRegion(
  code: string,
  masters: ItemMasters,
  isSplice = false,
): CutRegionEntry | null {
  const trimmed = code.trim()
  return cutRegionEntries(masters, isSplice).find((entry) => entry.code === trimmed) ?? null
}

// 加工方法の選択肢（番号＝process_types.number、値＝id）。番号が未設定の加工種別は出さない
export function processTypeOptions(masters: ItemMasters): CodeOption<string>[] {
  return sortByCode(
    masters.processTypes
      .filter((type) => type.number !== null)
      .map((type) => ({ code: String(type.number), label: type.name, value: type.id })),
  )
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
