// 明細（材料の行）の行を作る・複写する処理。

import { findCodeOption } from '@/lib/code-input/code-option'
import {
  NO_MANUFACTURER_CODE,
  PROCESS_REGION_CODE,
  STEEL_MAKING_OPTIONS,
  USUAL_VALUE_CODE,
} from './constants'
import {
  dimensionKindOf,
  materialOptionsFor,
  requiresManufacturer,
  resolveCutRegion,
} from './item-options'
import { isProcessRow } from './item-structure'
import { isQuantityAutomatic, processInputShapeOf, specInputFields } from './process-shapes'
import type {
  DimensionKind,
  ItemContext,
  ItemFieldName,
  ItemMasters,
  ItemRowValues,
} from './item-types'
import { NORMAL_ORDER_CONTEXT } from './resolve-item'

// 行を見分けるための ID を作る（画面の中だけで使う）
function newRowKey(): string {
  return crypto.randomUUID()
}

// 新しい空の行。初期値のある欄は Enter だけで進めるよう、初期値を入れておく
//   種類: 0 普通板 / 材質: 0 SS400 / 製鋼法: 1 電炉（SS400 の初期値）/ メーカー: 0 指定なし
// 「0 はいつもの値（初期値）」の考え方で、番号 0 の選択肢を初期値にしている
export function createEmptyItemRow(): ItemRowValues {
  return {
    key: newRowKey(),
    ...EMPTY_ITEM_VALUES,
  }
}

// 画面を開いたときの最初の空の行。
// 行の ID を乱数（randomUUID）にすると、サーバーでの描画とブラウザでの描画で別の ID になり、
// 欄の id 属性が食い違う（React のハイドレーションのエラーになる）。
// 最初の 1 行はサーバーでも描画されるため、決まった ID にする。
// あとから追加する行はブラウザの中だけで作られるため、乱数の ID のままでよい
export const INITIAL_ITEM_ROW_KEY = 'initial-row'

export function createInitialItemRow(): ItemRowValues {
  return {
    key: INITIAL_ITEM_ROW_KEY,
    ...EMPTY_ITEM_VALUES,
  }
}

// 空の行の入力値（key 以外）。何も入力していない行かの判定にも使う
export const EMPTY_ITEM_VALUES: Omit<ItemRowValues, 'key'> = {
  cutRegion: '',
  plateType: USUAL_VALUE_CODE,
  material: USUAL_VALUE_CODE,
  steelMaking: '1',
  manufacturer: NO_MANUFACTURER_CODE,
  thickness: '',
  width: '',
  length: '',
  outerDiameter: '',
  innerDiameter: '',
  plateSize: '',
  quantity: '',
  // 加工の行だけで使う欄。単位の初期値は 1 個
  processType: '',
  spec: '',
  holesPerPiece: '',
  holeDiameter: '',
  // 曲げのヶ所・曲げ方は「0 1ヶ所」「0 90°」が初期値（いつもの曲げなら Enter だけで進める）
  bendCount: USUAL_VALUE_CODE,
  bendCountFree: '',
  bendStyle: USUAL_VALUE_CODE,
  bendStyleFree: '',
  priceUnit: '1',
  unitPrice: '',
}

// 空の行と比べるための基準の行（key は比較に使わない）
export const INITIAL_ITEM_ROW: ItemRowValues = { key: '', ...EMPTY_ITEM_VALUES }

// 新しい加工の行（「+」で追加するとき）。切断・区分を 9 加工にした空の行
export function createProcessRow(): ItemRowValues {
  return { ...createEmptyItemRow(), cutRegion: PROCESS_REGION_CODE }
}

// 新しい行の ID（行の複写で、写した加工の行に新しい ID を振るときに使う）
export function newItemRowKey(): string {
  return newRowKey()
}

// 材質の番号から、その材質の製鋼法の初期値の番号を返す（材質が見つからなければ null）
function defaultSteelMakingCode(
  plateTypeId: string | null,
  materialCode: string,
  masters: ItemMasters,
): string | null {
  const materialId = findCodeOption(materialOptionsFor(plateTypeId, masters), materialCode)?.value
  const material = masters.materials.find((row) => row.id === materialId)
  if (!material) {
    return null
  }
  return STEEL_MAKING_OPTIONS.find((option) => option.value === material.default_steel_making)?.code ?? null
}

// 欄の値を変えたときに、連動して変わる欄も含めた新しい行を返す。
//   ・種類を変えると、新しい種類で選べない材質は初期値（0 SS400。なければ空）にし、
//     メーカーの初期値を合わせる（縞板のようにメーカー必須の種類は「0 指定なし」を選べないため空にする）
//   ・材質を入力・変更すると、製鋼法をその材質の初期値にする（そのあと手で変更できる）
export function applyItemFieldChange(
  row: ItemRowValues,
  field: ItemFieldName,
  value: string,
  masters: ItemMasters,
): ItemRowValues {
  const next: ItemRowValues = { ...row, [field]: value }

  const plateTypeId =
    masters.plateTypes.find((type) => String(type.number) === next.plateType.trim())?.id ?? null

  if (field === 'plateType') {
    const materialCodes = materialOptionsFor(plateTypeId, masters).map((option) => option.code)
    if (!materialCodes.includes(next.material.trim())) {
      // 選べない材質は、初期値（番号 0 の材質）があればそれに、なければ空にする
      next.material = materialCodes.includes(USUAL_VALUE_CODE) ? USUAL_VALUE_CODE : ''
    }
    const needsManufacturer = requiresManufacturer(plateTypeId, masters)
    if (needsManufacturer && next.manufacturer === NO_MANUFACTURER_CODE) {
      next.manufacturer = ''
    } else if (!needsManufacturer && next.manufacturer === '') {
      next.manufacturer = NO_MANUFACTURER_CODE
    }
  }

  // 材質が変わったら（種類の変更で材質が入れ替わった場合も含む）、製鋼法をその材質の初期値にする
  if ((field === 'material' || field === 'plateType') && next.material !== row.material) {
    const steelMakingCode = defaultSteelMakingCode(plateTypeId, next.material, masters)
    if (steelMakingCode) {
      next.steelMaking = steelMakingCode
    }
  }

  return next
}

// ------------------------------------------------------------
// 入力順
// ------------------------------------------------------------

// 明細の欄の ID（入力順の管理とエラーの表示先に使う）。行の ID と欄の名前をつなげる
export function itemFieldId(rowKey: string, field: ItemFieldName): string {
  return `${rowKey}:${field}`
}

// 行の先頭の欄の ID（材料の行は切断・区分、加工の行は加工方法）。次の行へ移るときに使う。
// 加工の行は切断・区分が「9 加工」で決まっているため、同じ位置に出す加工方法の欄が先頭になる
export function firstItemFieldId(row: ItemRowValues): string {
  return itemFieldId(row.key, isProcessRow(row) ? 'processType' : 'cutRegion')
}

// 寸法の入力欄（板厚の後）の並び
const DIMENSION_FIELDS: Record<DimensionKind, ItemFieldName[]> = {
  rectangle: ['width', 'length'],
  circle: ['outerDiameter'],
  donut: ['outerDiameter', 'innerDiameter'],
  plateSize: ['plateSize'],
}

// 加工の行の入力順。加工の項目の欄は、加工種別の入力の形で変わる（process-shapes/）。
//   自由入力: 加工方法 → 加工内容 → 数量
//   穴      : 加工方法 → 孔数 → 穴径
//   曲げ    : 加工方法 → ヶ所（→ ヶ所数）→ 曲げ方（→ 曲げ方の文字）
// 穴・曲げの数量は自動で求めるため、入力順に含めない。
// 単位・仕入単価は受注登録の画面では入力しない（仕入入力で扱う）
function processFieldOrder(row: ItemRowValues, masters: ItemMasters): ItemFieldName[] {
  const shape = processInputShapeOf(row, masters)
  const fields: ItemFieldName[] = ['processType', ...specInputFields(shape, row)]
  if (!isQuantityAutomatic(shape)) {
    fields.push('quantity')
  }
  return fields
}

// 1 行分の入力順（② 注文内容の画面）。
//   材料の行: 切断・区分 → 種類 → 材質 → 製鋼法 → メーカー → 板厚 → 寸法 → 数量
//   加工の行: 加工方法 → 加工の項目（入力の形による）→ 数量（自由入力のみ）
// 入力しない欄（材質のない種類の材質、「—」の製鋼法）は含めない。
// 明細ごとの摘要は使わないため、入力順に含めない
export function itemFieldOrder(
  row: ItemRowValues,
  flags: { needsMaterial: boolean; steelMakingApplicable: boolean },
  masters: ItemMasters,
  context: ItemContext = NORMAL_ORDER_CONTEXT,
): string[] {
  if (isProcessRow(row)) {
    return processFieldOrder(row, masters).map((field) => itemFieldId(row.key, field))
  }

  const fields: ItemFieldName[] = ['cutRegion', 'plateType']
  if (flags.needsMaterial) {
    fields.push('material')
  }
  if (flags.steelMakingApplicable) {
    fields.push('steelMaking')
  }
  fields.push('manufacturer', 'thickness')

  // 切断・区分がまだ決まっていない場合は、寸法の欄を入力順に入れない（決めると現れる）
  const regionKind = dimensionKindOf(resolveCutRegion(row.cutRegion, masters, context.isSplice)?.region ?? null)
  if (regionKind) {
    fields.push(...DIMENSION_FIELDS[regionKind])
  }
  fields.push('quantity')
  return fields.map((field) => itemFieldId(row.key, field))
}
