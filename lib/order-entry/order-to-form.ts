// 登録済みの受注（DB の値）を、受注登録の画面の入力値（番号・文字）に戻す（処理区分 1 変更。PR 9b）。
//
// 画面の入力値は「打つ番号・文字」で持つ（売り先は 1001、切断・区分は 41 など）。DB には id や値を保存しているため、
// マスタ・定数の選択肢から逆に番号を引いて戻す。
//   ・受注情報: 売り先・入れ先・配達・加工場所・担当者は id → 番号。部材区分・納期種別・ショット・至急は値 → 番号
//   ・材料の行: 切断方法・切断区分・特殊製品の種別・定尺から「切断・区分」の 2 桁の番号を探し（cutRegionEntries）、
//               商品（product_id）から種類・材質・板厚を引く。製鋼法・メーカー・寸法・定尺サイズ・数量も戻す
//   ・加工の行: 加工方法の番号・単位・仕入単価。入力の形ごとの項目は spec_fields から戻す
//               （穴: 孔数・穴径 / 曲げ: ヶ所・曲げ方・フリーの文字 / 自由入力: 加工内容と数量）。母材の材料の行のすぐ下に並べる
//   ・スタンプ: 得意先の指定スタンプとの違いを、画面の「付け外し」（StampOverrides）の形にする
// 戻せない値（マスタから消えた商品など）は空の欄にする。画面の確認でエラーになり、直さないと保存できない。
// 行の ID はサーバーとブラウザで同じになるよう、決まった形（order-line-1 など）にする
// （乱数にすると、サーバーでの描画とブラウザでの描画で欄の id が食い違う。item-row.ts の createInitialItemRow と同じ考え方）。
// どれも画面や DB に依存しない純粋な関数にして、テストする。

import type { CodeOption } from '@/lib/code-input/code-option'
import { URGENT_OPTIONS } from '@/lib/intake/constants'
import {
  BEND_COUNT_OPTIONS,
  BEND_STYLE_OPTIONS,
  DUE_DATE_TYPE_OPTIONS,
  FREE_INPUT_CODE,
  MEMBER_CLASS_OPTIONS,
  NO_MANUFACTURER_CODE,
  PLATE_SIZE_OPTIONS,
  PROCESS_PRICE_UNIT_OPTIONS,
  PROCESS_REGION_CODE,
  SAME_AS_CUSTOMER_CODE,
  SHOT_OPTIONS,
  SPLICE_MEMBER_CLASS,
  STEEL_MAKING_OPTIONS,
} from './constants'
import { cutRegionEntries, materialOptionsFor, processTypeOptions } from './item-options'
import { EMPTY_ITEM_VALUES } from './item-row'
import type { ItemMasters, ItemRowValues } from './item-types'
import type { StampOverrides } from './stamps'
import type { HeaderMasterOptions, HeaderValues } from './use-order-header'

// ------------------------------------------------------------
// DB から読んだ受注の形（lib/order-entry/load-order-for-edit.ts で読む）
// ------------------------------------------------------------

export type StoredProcess = {
  lineNo: number
  processTypeId: string
  spec: string | null
  // 入力の形ごとの項目（{"shape": "穴", "holes_per_piece": 12, ...}）。自由入力では null のこともある
  specFields: Record<string, unknown> | null
  quantity: number | null
  unitPrice: number | null
  priceUnit: string
}

export type StoredItem = {
  lineNo: number
  productId: string
  cuttingMethod: string | null
  cuttingType: string | null
  specialProductTypeId: string | null
  plateSize: string | null
  steelMaking: string | null
  width: number | null
  length: number | null
  outerDiameter: number | null
  innerDiameter: number | null
  quantity: number
  manufacturerSpecifiedId: string | null
  processes: StoredProcess[]
}

export type StoredOrderHeader = {
  orderDate: string
  memberClass: string
  jointNo: string | null
  spliceShot: boolean | null
  staffId: string
  isUrgent: boolean
  customerId: string
  customerContact: string | null
  deliveryDestinationId: string | null
  projectName: string | null
  dueDateType: string
  dueDate: string | null
  deliveryMethodId: string
  deliveryMethodNote: string | null
  siteId: string
}

// 値（id など）から、打つ番号を引く。見つからなければ空
function codeOf<T>(options: readonly CodeOption<T>[], value: T | null | undefined): string {
  if (value === null || value === undefined) return ''
  return options.find((option) => option.value === value)?.code ?? ''
}

// 数値を欄の文字に戻す（null は空）
function textOf(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

// ------------------------------------------------------------
// 受注情報
// ------------------------------------------------------------

// 受注情報の入力値。処理区分は 1 変更にする
export function headerValuesFromOrder(order: StoredOrderHeader, masters: HeaderMasterOptions): HeaderValues {
  const isSplice = order.memberClass === SPLICE_MEMBER_CLASS
  return {
    processingType: '1',
    memberClass: codeOf(MEMBER_CLASS_OPTIONS, order.memberClass as (typeof MEMBER_CLASS_OPTIONS)[number]['value']),
    jointNo: isSplice ? (order.jointNo ?? '') : '',
    spliceShot: isSplice ? codeOf(SHOT_OPTIONS, order.spliceShot) : '',
    orderDate: order.orderDate,
    staffId: codeOf(masters.staff, order.staffId),
    isUrgent: codeOf(URGENT_OPTIONS, order.isUrgent),
    customerId: codeOf(masters.customers, order.customerId),
    customerContact: order.customerContact ?? '',
    // 入れ先が NULL なら「0 売り先と同じ」
    deliveryDestinationId:
      order.deliveryDestinationId === null
        ? SAME_AS_CUSTOMER_CODE
        : codeOf(masters.destinations, order.deliveryDestinationId),
    projectName: order.projectName ?? '',
    dueDateType: codeOf(DUE_DATE_TYPE_OPTIONS, order.dueDateType as (typeof DUE_DATE_TYPE_OPTIONS)[number]['value']),
    dueDate: order.dueDate ?? '',
    deliveryMethodId: codeOf(masters.deliveryMethods, order.deliveryMethodId),
    deliveryMethodNote: order.deliveryMethodNote ?? '',
    siteId: codeOf(masters.sites, order.siteId),
  }
}

// ------------------------------------------------------------
// 明細
// ------------------------------------------------------------

// 切断・区分の番号を、保存した切断方法・切断区分・特殊製品の種別・定尺サイズから探す。見つからなければ空
export function cutRegionCodeOf(item: StoredItem, masters: ItemMasters, isSplice: boolean): string {
  const entries = cutRegionEntries(masters, isSplice)
  const found = entries.find((entry) => {
    const { region } = entry
    if (item.specialProductTypeId) {
      return (
        region.kind === 'special' &&
        region.type.id === item.specialProductTypeId &&
        entry.cuttingMethod === item.cuttingMethod &&
        (region.cuttingType ?? null) === item.cuttingType
      )
    }
    // 定尺売りは切断方法を NULL で保存している
    if (item.cuttingMethod === null) return region.kind === 'standard'
    return region.kind === 'cut' && entry.cuttingMethod === item.cuttingMethod && region.cuttingType === item.cuttingType
  })
  return found?.code ?? ''
}

// 材料の行 1 行分
function materialRowValues(item: StoredItem, masters: ItemMasters, isSplice: boolean): Omit<ItemRowValues, 'key'> {
  const product = masters.products.find((row) => row.id === item.productId)
  const plateType = product ? masters.plateTypes.find((row) => row.id === product.plate_type_id) : undefined
  // 材質の番号は、その種類で選べる材質の選択肢から引く（画面と同じ選択肢）
  const materialCode =
    product && product.material_id ? codeOf(materialOptionsFor(product.plate_type_id, masters), product.material_id) : ''
  const manufacturerCode =
    item.manufacturerSpecifiedId === null
      ? NO_MANUFACTURER_CODE
      : (masters.manufacturers.find((row) => row.id === item.manufacturerSpecifiedId)?.code ?? '')

  return {
    ...EMPTY_ITEM_VALUES,
    cutRegion: cutRegionCodeOf(item, masters, isSplice),
    plateType: plateType ? String(plateType.number) : '',
    // 材質のない種類（ボンデなど）は、空の初期値に戻す（画面の入力順に材質の欄が出ない）
    material: product && product.material_id === null ? EMPTY_ITEM_VALUES.material : materialCode,
    // 製鋼法を入れない行（定尺売り・縞板など）は NULL で保存している。欄の初期値のままにする
    steelMaking:
      item.steelMaking === null
        ? EMPTY_ITEM_VALUES.steelMaking
        : codeOf(STEEL_MAKING_OPTIONS, item.steelMaking as (typeof STEEL_MAKING_OPTIONS)[number]['value']),
    manufacturer: manufacturerCode,
    thickness: product ? String(product.thickness) : '',
    width: textOf(item.width),
    length: textOf(item.length),
    outerDiameter: textOf(item.outerDiameter),
    innerDiameter: textOf(item.innerDiameter),
    plateSize:
      item.plateSize === null
        ? ''
        : codeOf(PLATE_SIZE_OPTIONS, item.plateSize as (typeof PLATE_SIZE_OPTIONS)[number]['value']),
    quantity: String(item.quantity),
  }
}

// spec_fields の値を数値として読む
function numberField(fields: Record<string, unknown> | null, key: string): number | null {
  const value = fields?.[key]
  return typeof value === 'number' ? value : null
}

// 加工の行 1 行分
function processRowValues(process: StoredProcess, masters: ItemMasters): Omit<ItemRowValues, 'key'> {
  const fields = process.specFields
  const master = masters.processTypes.find((row) => row.id === process.processTypeId)
  // 入力の形は保存した項目の shape を優先し、なければ加工種別マスタの入力の形
  const shape = typeof fields?.shape === 'string' ? fields.shape : (master?.input_shape ?? '自由入力')
  const values: Omit<ItemRowValues, 'key'> = {
    ...EMPTY_ITEM_VALUES,
    cutRegion: PROCESS_REGION_CODE,
    processType: codeOf(processTypeOptions(masters), process.processTypeId),
    priceUnit: codeOf(
      PROCESS_PRICE_UNIT_OPTIONS,
      process.priceUnit as (typeof PROCESS_PRICE_UNIT_OPTIONS)[number]['value']
    ),
    unitPrice: textOf(process.unitPrice),
  }

  if (shape === '穴') {
    return {
      ...values,
      holesPerPiece: textOf(numberField(fields, 'holes_per_piece')),
      holeDiameter: textOf(numberField(fields, 'hole_diameter')),
    }
  }
  if (shape === '曲げ') {
    const bendCount = numberField(fields, 'bend_count')
    // 番号の選択肢にあるヶ所数ならその番号、なければ 9 フリー＋ヶ所数
    const countCode = codeOf(BEND_COUNT_OPTIONS, bendCount)
    const style = typeof fields?.bend_style === 'string' ? fields.bend_style : null
    const note = typeof fields?.bend_style_note === 'string' ? fields.bend_style_note : ''
    return {
      ...values,
      bendCount: countCode !== '' ? countCode : FREE_INPUT_CODE,
      bendCountFree: countCode !== '' ? '' : textOf(bendCount),
      bendStyle: codeOf(BEND_STYLE_OPTIONS, style as (typeof BEND_STYLE_OPTIONS)[number]['value'] | null),
      bendStyleFree: note,
    }
  }
  // 自由入力: 加工内容と数量（穴・曲げの数量は母材の枚数から求めるため、戻さない）
  return { ...values, spec: process.spec ?? '', quantity: textOf(process.quantity) }
}

// 明細を画面の行に戻す。材料の行の下に、その材料の加工の行を行番号の順に並べる
export function itemRowsFromOrder(items: readonly StoredItem[], masters: ItemMasters, isSplice: boolean): ItemRowValues[] {
  const rows: ItemRowValues[] = []
  for (const item of [...items].sort((a, b) => a.lineNo - b.lineNo)) {
    rows.push({ key: `order-line-${item.lineNo}`, ...materialRowValues(item, masters, isSplice) })
    for (const process of [...item.processes].sort((a, b) => a.lineNo - b.lineNo)) {
      rows.push({
        key: `order-line-${item.lineNo}-process-${process.lineNo}`,
        ...processRowValues(process, masters),
      })
    }
  }
  return rows
}

// ------------------------------------------------------------
// スタンプ
// ------------------------------------------------------------

// 保存したスタンプ（チェックしていたもの）を、得意先の指定スタンプとの違い（付け外し）の形にする。
//   ・指定スタンプなのにチェックしていなかった → 外した（false）
//   ・指定スタンプではないのにチェックしていた → 付けた（true）
export function stampOverridesFor(
  checkedIds: readonly string[],
  designatedIds: ReadonlySet<string>
): StampOverrides {
  const checked = new Set(checkedIds)
  const overrides: Record<string, boolean> = {}
  for (const id of designatedIds) {
    if (!checked.has(id)) overrides[id] = false
  }
  for (const id of checked) {
    if (!designatedIds.has(id)) overrides[id] = true
  }
  return overrides
}

// ------------------------------------------------------------
// 変更の画面に渡すもの
// ------------------------------------------------------------

// 処理区分 1 変更で呼び出した受注を、画面の入力値にしたもの（app/(main)/orders/edit/page.tsx で作る）
export type OrderEditValues = {
  orderId: string
  orderNo: string
  // 画面を開いたときの受注の更新日時（保存のときに、ほかの人が先に保存していないかを比べる）
  updatedAt: string
  header: HeaderValues
  items: ItemRowValues[]
  stampOverrides: StampOverrides
  freeComment: string
}
