// 送り状の印刷の 4 部と、1 部ごとの明細の行（docs/screen-design.md「送り状の印刷」）。
// 画面や DB に依存しない純粋な関数にして、テストする。
//
//   | 部                     | 重量   | 右の欄                         | 渡す相手               |
//   | 積み込み用             | 実重量 | 配送（配達・実重量の合計）     | 積み込みをする人       |
//   | 運転手用（倉出し）     | 実重量 | 配送（配達・実重量の合計）     | 運転手                 |
//   | 受領書（お客様控え）   | 角重量 | お客様のサインの欄             | お客様                 |
//   | 送り状（弊社控え）     | 角重量 | お客様のサインの欄             | 配達後にサインをもらって持ち帰る |
// 事務所の控えは印刷しない（事務所と配送部は画面でやり取りする）。
// 積み込み・配送は実重量（運送の費用と積載の目安）、受領書・送り状は角重量（請求の根拠）を出す。
// 受領書・送り状には単価・金額を出さず、その位置（右の欄）にお客様のサインの欄を置く（配達後にサインをもらうため）。
// 実重量が未入力の行（アイトレ・ササラ）は、実重量の部でも角重量で代わりに数え、「角」の印を付ける。

import { roundTo } from '@/lib/pricing/rounding'
import { deliveryWeight, issuedLineWeights } from './shipment-lines'
import type { IssuedShipmentLine } from './types'

export type ShipmentCopyKind = 'loading' | 'driver' | 'receipt' | 'office'

export type ShipmentCopy = {
  kind: ShipmentCopyKind
  // 伝票の名前（左上に大きく出す）
  title: string
  // 出す重量（actual: 実重量 / square: 角重量）
  weight: 'actual' | 'square'
  // 右の欄にお客様のサインの欄を置くか（置かない部は、配送の欄を置く）
  signature: boolean
}

// 印刷する順（重ねて渡す順）
export const SHIPMENT_COPIES: readonly ShipmentCopy[] = [
  { kind: 'loading', title: '積み込み用', weight: 'actual', signature: false },
  { kind: 'driver', title: '運転手用（倉出し）', weight: 'actual', signature: false },
  { kind: 'receipt', title: '受領書（お客様控え）', weight: 'square', signature: true },
  { kind: 'office', title: '送り状（弊社控え）', weight: 'square', signature: true },
]

// A4 の横の 1 ページに入る明細の行数。上部の項目（約 40mm）・表の見出し（7mm）・合計（約 8mm）を除いた高さに、
// 行の高さ 8mm で 15 行ほど入る。端数の余裕を残して 12 行にする（印刷してみて変えたいときは、この値だけを直す）
export const SHIPMENT_ROWS_PER_PAGE = 12

// 送り状の 1 行。材料の行と、その下の加工の行（加工の行は文だけで、数量・重量は持たない）
export type ShipmentSheetMaterialLine = {
  kind: 'material'
  lineNo: number
  cuttingMethod: string
  productName: string
  quantity: number
  weight: number | null
  // 実重量の部で、実重量がわからず角重量で代わりに数えた行
  estimated: boolean
}

export type ShipmentSheetProcessLine = {
  kind: 'process'
  parentLineNo: number
  text: string
}

export type ShipmentSheetLine = ShipmentSheetMaterialLine | ShipmentSheetProcessLine

// 1 部の明細の行（材料の行の行番号順。加工の行は母材のすぐ下）
export function buildSheetLines(lines: readonly IssuedShipmentLine[], copy: ShipmentCopy): ShipmentSheetLine[] {
  const result: ShipmentSheetLine[] = []
  for (const line of [...lines].sort((a, b) => a.lineNo - b.lineNo)) {
    const weight =
      copy.weight === 'square'
        ? { weight: line.squareWeight, estimated: false }
        : deliveryWeight(issuedLineWeights(line))
    result.push({
      kind: 'material',
      lineNo: line.lineNo,
      cuttingMethod: line.cuttingMethod,
      productName: line.productName,
      quantity: line.quantity,
      weight: weight.weight,
      estimated: weight.estimated,
    })
    for (const text of line.processes) {
      result.push({ kind: 'process', parentLineNo: line.lineNo, text })
    }
  }
  return result
}

// 1 部の合計（数量・その部の重量の合計・角重量で代わりに数えた行数）
export type ShipmentSheetTotals = { quantity: number; weight: number; estimatedCount: number }

// 1 部分のページと合計（印刷の画面に渡す）
export type ShipmentCopyPages = {
  copy: ShipmentCopy
  pages: ShipmentSheetLine[][]
  totals: ShipmentSheetTotals
}

// 1 部の合計を求める。重量は小数第 2 位までに丸める
export function sumSheetLines(lines: readonly ShipmentSheetLine[]): ShipmentSheetTotals {
  let quantity = 0
  let weight = 0
  let estimatedCount = 0
  for (const line of lines) {
    if (line.kind !== 'material') continue
    quantity += line.quantity
    weight += line.weight ?? 0
    if (line.estimated) estimatedCount += 1
  }
  return { quantity, weight: roundTo(weight, 2), estimatedCount }
}
