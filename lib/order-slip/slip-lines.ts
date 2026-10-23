// 現場用伝票の明細の行を組み立てる（docs/screen-design.md「現場用伝票の印刷」の「明細」）。
//
// 保存した明細（材料の行・加工の行）から、伝票に載せる文と数値を作る。画面や DB に依存しない純粋な関数にして、テストする。
//
//   品名と寸法: [種類（普通板以外）] [材質] [製鋼法（材質の初期値と違うとき）] [区分] [寸法]（メーカー指定）
//               例: SN490C 寸法切 40 X 660 X 660 / 縞板 アイトレ 3.2 X 1219 X 2438（メーカーA指定）
//                   SS400 ベタ丸 9 X φ300 / SS400 定尺 4.5 X 4x8
//   区分      : 寸法切・アイトレ（シャーリングは型切り）。特殊製品は種別の名前（ササラ・ベタ丸など）。
//               スプライス専用の受注の明細は切断区分（寸法切・アイトレ）。定尺売りは「定尺」
//   寸法      : 角は「板厚 X 縦 X 横」、円は「板厚 X φ直径」、ドーナツは「板厚 X φ外径-φ内径」、定尺は「板厚 X 定尺サイズ」
//   重量      : 受注登録の画面と同じ決まり。ベタ丸・ドーナツは実重量、ササラは使用材重量、それ以外は角重量。
//               1 枚あたりの重量 × 枚数を小数第 2 位までに丸める（lib/pricing/weight.ts の calcTotalWeight）
//   加工の行  : 材料の行のすぐ下に「加工方法 加工内容」を出す。重量は持たない（材料の重量を二重に数えないため）。
//               加工内容は項目（spec_fields）から組み立てる（lib/order-entry/process-shapes の formatProcessSpec）
//   板厚の区切り: 明細の並びは入力した順のまま変えず、前の材料の行と板厚が違う行に印を付ける（上に太い線を引く）。
//               入力の段階で、現場が加工しやすい順に打っているため
//   金額      : 単価記入用だけで使う。受注登録の画面と同じ計算（lib/pricing/amount.ts・process-row.ts）

import { calcAmount } from '@/lib/pricing/amount'
import { ceilToYen } from '@/lib/pricing/rounding'
import { calcTotalWeight } from '@/lib/pricing/weight'
import { BEND_STYLE_OPTIONS, SHEARING_IRREGULAR_CUT_LABEL, STEEL_MAKING_OPTIONS } from '@/lib/order-entry/constants'
import { formatProcessSpec, type ProcessSpec } from '@/lib/order-entry/process-shapes'
import { lineColorCss } from './slip-format'
import type { SlipItemSource, SlipLine, SlipMaterialLine, SlipProcessLine, SlipProcessSource } from './types'

// 種類の初期値の番号（普通板）。品名には普通板以外のときだけ種類を出す（lib/order-entry/product-name.ts と同じ）
const DEFAULT_PLATE_TYPE_NUMBER = 0

// 寸法の区切り（現行の伝票と同じく、大文字の X を使う）
const DIMENSION_SEPARATOR = ' X '

// ------------------------------------------------------------
// 材料の行
// ------------------------------------------------------------

// 区分の名前
export function cutRegionLabel(item: SlipItemSource): string {
  // 定尺売りは切断を伴わないため、切断方法を NULL で保存している
  if (item.cuttingMethod === null) return '定尺'
  // スプライス以外の特殊製品は、種別の名前（ササラ・ベタ丸・ドーナツ）
  if (item.specialProduct && !item.specialProduct.isSpliceOrderType) return item.specialProduct.name
  // シャーリングのアイトレは「型切り」と呼ぶ（保存する値はアイトレ。受注登録の画面の表示と同じ）
  if (item.cuttingType === 'アイトレ' && item.cuttingMethod === 'シャーリング') return SHEARING_IRREGULAR_CUT_LABEL
  return item.cuttingType ?? ''
}

// 寸法（板厚を含む）。区分の形は、保存した列のどれに値があるかで決める
export function dimensionText(item: SlipItemSource): string {
  const thickness = String(item.thickness)
  if (item.width !== null && item.length !== null) {
    return [thickness, item.width, item.length].join(DIMENSION_SEPARATOR)
  }
  if (item.outerDiameter !== null) {
    const circle =
      item.innerDiameter !== null ? `φ${item.outerDiameter}-φ${item.innerDiameter}` : `φ${item.outerDiameter}`
    return `${thickness}${DIMENSION_SEPARATOR}${circle}`
  }
  if (item.plateSize !== null) {
    return `${thickness}${DIMENSION_SEPARATOR}${item.plateSize}`
  }
  return thickness
}

// 品名と寸法
export function productNameText(item: SlipItemSource): string {
  const parts: string[] = []
  if (item.plateTypeNumber !== DEFAULT_PLATE_TYPE_NUMBER) parts.push(item.plateTypeName)
  if (item.materialName) parts.push(item.materialName)
  // 製鋼法は、材質の初期値（SS400 は電炉、規格材は高炉）と違うときだけ出す。
  // いつもの値まで毎回出すと、違う指定が目立たなくなるため
  if (item.steelMaking && item.steelMaking !== item.materialDefaultSteelMaking) {
    const label = STEEL_MAKING_OPTIONS.find((option) => option.value === item.steelMaking)?.label
    if (label) parts.push(label)
  }
  const region = cutRegionLabel(item)
  if (region) parts.push(region)
  parts.push(dimensionText(item))
  const name = parts.join(' ')
  return item.manufacturerName ? `${name}（${item.manufacturerName}指定）` : name
}

// 伝票に載せる 1 枚あたりの重量（受注登録の画面の重量の欄と同じ決まり）
//   ・ベタ丸・ドーナツ（直径がある行）は実重量
//   ・ササラ（使用材重量がある行）は使用材重量
//   ・それ以外は角重量
function displayPieceWeight(item: SlipItemSource): number | null {
  if (item.outerDiameter !== null) return item.actualWeight
  if (item.materialWeight !== null) return item.materialWeight
  return item.squareWeight
}

// 単価の根拠にした 1 枚あたりの重量（kg 単価の金額の計算に使う）。
// 特殊製品は種別の weight_basis、それ以外は角重量（lib/pricing/calculate-price.ts と同じ）
function billingPieceWeight(item: SlipItemSource): number | null {
  switch (item.specialProduct?.weightBasis) {
    case '実重量':
      return item.actualWeight
    case '使用材重量':
      return item.materialWeight
    default:
      return item.squareWeight
  }
}

// 材料の行の仕入金額。単価が決まっていなければ null
function materialAmount(item: SlipItemSource): number | null {
  if (item.unitPrice === null) return null
  if (item.priceUnit === '枚') {
    return calcAmount({ priceUnit: '枚', unitPrice: item.unitPrice, billingWeight: 0 }, item.quantity)
  }
  const billingWeight = billingPieceWeight(item)
  if (item.priceUnit !== 'kg' || billingWeight === null) return null
  return calcAmount({ priceUnit: 'kg', unitPrice: item.unitPrice, billingWeight }, item.quantity)
}

function materialLine(item: SlipItemSource, previousThickness: number | null): SlipMaterialLine {
  const pieceWeight = displayPieceWeight(item)
  return {
    kind: 'material',
    lineNo: item.lineNo,
    cuttingMethod: item.cuttingMethod ?? '',
    productName: productNameText(item),
    thickness: item.thickness,
    quantity: item.quantity,
    weight: pieceWeight === null ? null : calcTotalWeight(pieceWeight, item.quantity),
    // 材質ラインは、材質の名前ではなく、マスタにラインが登録されているかだけで決める
    lineMark: item.lineMark ? { text: item.lineMark, color: lineColorCss(item.displayColor) } : null,
    thicknessBreak: previousThickness !== null && previousThickness !== item.thickness,
    unitPrice: item.unitPrice,
    priceUnit: item.unitPrice === null ? null : item.priceUnit,
    amount: materialAmount(item),
  }
}

// ------------------------------------------------------------
// 加工の行
// ------------------------------------------------------------

function numberOf(fields: Record<string, unknown> | null, key: string): number | null {
  const value = fields?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// 保存した加工の項目（spec_fields）を、加工内容の文を組み立てる形（ProcessSpec）に戻す。
// 項目がそろっていない・形が分からないときは、自由入力の文（spec 列）として扱う
export function processSpecFromStored(process: Pick<SlipProcessSource, 'spec' | 'specFields'>): ProcessSpec {
  const fields = process.specFields
  if (fields?.shape === '穴') {
    const holesPerPiece = numberOf(fields, 'holes_per_piece')
    const holeDiameter = numberOf(fields, 'hole_diameter')
    if (holesPerPiece !== null && holeDiameter !== null) return { shape: '穴', holesPerPiece, holeDiameter }
  }
  if (fields?.shape === '曲げ') {
    const bendCount = numberOf(fields, 'bend_count')
    const style = BEND_STYLE_OPTIONS.find((option) => option.value === fields.bend_style)?.value
    const note = typeof fields.bend_style_note === 'string' ? fields.bend_style_note : null
    if (bendCount !== null && style) return { shape: '曲げ', bendCount, bendStyle: style, bendStyleNote: note }
  }
  return { shape: '自由入力', text: process.spec ?? '' }
}

// 加工方法と加工内容（例: キリ孔 1S/ 12孔 38φ。加工内容が空なら加工方法だけ）
export function processText(process: SlipProcessSource): string {
  const spec = formatProcessSpec(processSpecFromStored(process)).trim()
  return spec === '' ? process.processTypeName : `${process.processTypeName} ${spec}`
}

// 加工の行の仕入金額（lib/order-entry/process-row.ts の calculateProcess と同じ）。
//   個: 仕入単価 × 数量 / kg: 仕入単価 × 母材の合計重量（単価の根拠の重量。ササラは使用材重量、それ以外は角重量）
function processAmount(process: SlipProcessSource, parent: SlipItemSource): number | null {
  if (process.unitPrice === null || process.quantity === null) return null
  if (process.priceUnit === '個') return ceilToYen(process.unitPrice * process.quantity)
  const parentPiece = parent.materialWeight ?? parent.squareWeight
  if (process.priceUnit !== 'kg' || parentPiece === null) return null
  return ceilToYen(process.unitPrice * calcTotalWeight(parentPiece, parent.quantity))
}

function processLine(process: SlipProcessSource, parent: SlipItemSource): SlipProcessLine {
  return {
    kind: 'process',
    parentLineNo: parent.lineNo,
    text: processText(process),
    quantity: process.quantity,
    unitPrice: process.unitPrice,
    priceUnit: process.unitPrice === null ? null : process.priceUnit,
    amount: processAmount(process, parent),
  }
}

// ------------------------------------------------------------
// 明細全体
// ------------------------------------------------------------

// 伝票の行の並び（材料の行の行番号順。加工の行は母材のすぐ下に、加工の行番号順で並べる）
export function buildSlipLines(items: readonly SlipItemSource[]): SlipLine[] {
  const lines: SlipLine[] = []
  let previousThickness: number | null = null
  const sorted = [...items].sort((a, b) => a.lineNo - b.lineNo)
  for (const item of sorted) {
    lines.push(materialLine(item, previousThickness))
    previousThickness = item.thickness
    const processes = [...item.processes].sort((a, b) => a.lineNo - b.lineNo)
    for (const process of processes) {
      lines.push(processLine(process, item))
    }
  }
  return lines
}

// 右の欄に出す材質ラインのまとめ（材質ごとに 1 つ。明細に出てきた順）
export type SlipLineMarkSummary = { materialName: string; text: string; color: string | null }

export function lineMarkSummaries(items: readonly SlipItemSource[]): SlipLineMarkSummary[] {
  const summaries: SlipLineMarkSummary[] = []
  const sorted = [...items].sort((a, b) => a.lineNo - b.lineNo)
  for (const item of sorted) {
    // 材質の名前では分けず、ラインが登録されているかだけで決める
    if (!item.lineMark || !item.materialName) continue
    if (summaries.some((summary) => summary.materialName === item.materialName)) continue
    summaries.push({ materialName: item.materialName, text: item.lineMark, color: lineColorCss(item.displayColor) })
  }
  return summaries
}

// 伝票の下に出す合計。重量は材料の行だけ、金額は材料の行と加工の行の両方（受注登録の画面の合計と同じ）
export type SlipTotals = {
  totalWeight: number
  totalAmount: number
  // 単価が決まっていない行の数（単価記入用で手で書き込む行）
  unpricedCount: number
}

export function sumSlipLines(lines: readonly SlipLine[]): SlipTotals {
  let totalWeight = 0
  let totalAmount = 0
  let unpricedCount = 0
  for (const line of lines) {
    if (line.kind === 'material' && line.weight !== null) totalWeight += line.weight
    if (line.amount === null) unpricedCount += 1
    else totalAmount += line.amount
  }
  // 浮動小数点の誤差が合計で目立たないよう、重量は小数第 2 位までに丸める（item-totals.ts と同じ）
  return { totalWeight: Math.round(totalWeight * 100) / 100, totalAmount, unpricedCount }
}
