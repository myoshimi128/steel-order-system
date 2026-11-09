// 送り状の数量・重量の計算と、入力の確かめ（docs/screen-design.md「送り状発行」）。
// 画面や DB に依存しない純粋な関数にして、テストする。
//
//   残り        : 受注数量 − 今までの送り状の数量の合計（列には持たず、ここで計算する）
//   今回の数量  : 初期値は残り（全部出す）。減らせば分納、0 にした行はその回は出さない
//   角重量      : 1 枚あたりの角重量（ササラは使用材重量）× 今回の数量。請求の根拠で、受領書・送り状（弊社控え）に出す
//   実重量      : 1 枚あたりの実重量 × 今回の数量。配送の依頼に使い、積み込み用・運転手用に出す。
//                 受注の明細に実重量がない行（アイトレ・ササラ）は、画面で 1 枚あたりの値を入力する（任意）。
//                 入力しなかった行は、配送の重量に角重量を代わりに使い、「角」の印を付ける
// 合計重量は、1 枚あたり × 枚数を小数第 2 位までに丸めてから足す（lib/pricing/weight.ts の calcTotalWeight）。

import { calcTotalWeight } from '@/lib/pricing/weight'
import { roundTo } from '@/lib/pricing/rounding'
import type { IssuedShipmentLine, ShipmentOrderItem } from './types'

// 残りの数量
export function remainingQuantity(item: Pick<ShipmentOrderItem, 'orderedQuantity' | 'shippedQuantity'>): number {
  return Math.max(0, item.orderedQuantity - item.shippedQuantity)
}

// 受注の残りの合計（一覧の「残り」の列。明細の残りを足す）
export function totalRemaining(items: readonly Pick<ShipmentOrderItem, 'orderedQuantity' | 'shippedQuantity'>[]): number {
  return items.reduce((sum, item) => sum + remainingQuantity(item), 0)
}

// 実重量を画面で入力する行か（受注の明細に 1 枚あたりの実重量がない行）
export function needsActualWeightInput(item: Pick<ShipmentOrderItem, 'actualPieceWeight'>): boolean {
  return item.actualPieceWeight === null
}

// ------------------------------------------------------------
// 入力の値
// ------------------------------------------------------------

// 明細 1 行の入力の値（欄の文字のまま持つ）
export type ShipmentEntryValues = {
  quantity: string
  // 1 枚あたりの実重量（実重量を入力する行だけ使う）
  pieceWeight: string
}

// 入力の初期値。今回の数量は残り（全部出す）、実重量は前回の送り状で入力した値
export function initialEntryValues(items: readonly ShipmentOrderItem[]): Record<string, ShipmentEntryValues> {
  const values: Record<string, ShipmentEntryValues> = {}
  for (const item of items) {
    values[item.id] = {
      quantity: String(remainingQuantity(item)),
      pieceWeight:
        needsActualWeightInput(item) && item.lastInputPieceWeight !== null ? String(item.lastInputPieceWeight) : '',
    }
  }
  return values
}

// 欄の文字を数にする。空や数にならなければ null
function parseNumber(text: string): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

// ------------------------------------------------------------
// 重量
// ------------------------------------------------------------

// 明細 1 行の今回の重量
export type ShipmentLineWeights = {
  // 角重量の合計（請求の根拠）。保存した重量がなければ null
  square: number | null
  // 実重量の合計。実重量がわからない（入力していない）ときは null
  actual: number | null
}

export function lineWeights(
  item: Pick<ShipmentOrderItem, 'billingPieceWeight' | 'actualPieceWeight'>,
  quantity: number,
  pieceWeightInput: number | null
): ShipmentLineWeights {
  const actualPiece = item.actualPieceWeight ?? pieceWeightInput
  return {
    square: item.billingPieceWeight === null ? null : calcTotalWeight(item.billingPieceWeight, quantity),
    actual: actualPiece === null ? null : calcTotalWeight(actualPiece, quantity),
  }
}

// 配送の依頼に使う重量。実重量がわからなければ角重量で代わりに数える（estimated: 「角」の印を付ける）
export function deliveryWeight(weights: ShipmentLineWeights): { weight: number | null; estimated: boolean } {
  if (weights.actual !== null) return { weight: weights.actual, estimated: false }
  return { weight: weights.square, estimated: weights.square !== null }
}

// 送り状全体の合計
export type ShipmentTotals = {
  quantity: number
  // 角重量の合計（請求の根拠）
  squareWeight: number
  // 配送の依頼に使う重量の合計（実重量。わからない行は角重量で代わりに数える）
  deliveryWeight: number
  // 実重量がわからず、角重量で代わりに数えた行の数
  estimatedCount: number
}

export function sumShipmentWeights(lines: readonly { quantity: number; weights: ShipmentLineWeights }[]): ShipmentTotals {
  let quantity = 0
  let square = 0
  let delivery = 0
  let estimatedCount = 0
  for (const line of lines) {
    if (line.quantity <= 0) continue
    quantity += line.quantity
    square += line.weights.square ?? 0
    const deliveryLine = deliveryWeight(line.weights)
    delivery += deliveryLine.weight ?? 0
    if (deliveryLine.estimated) estimatedCount += 1
  }
  // 浮動小数点の誤差が合計で目立たないよう、小数第 2 位までに丸める（現場用伝票の合計と同じ）
  return { quantity, squareWeight: roundTo(square, 2), deliveryWeight: roundTo(delivery, 2), estimatedCount }
}

// 発行済みの送り状の行を、合計の計算の形にする
export function issuedLineWeights(line: Pick<IssuedShipmentLine, 'squareWeight' | 'actualWeight'>): ShipmentLineWeights {
  return { square: line.squareWeight, actual: line.actualWeight }
}

// 前回の送り状で入力した 1 枚あたりの実重量（保存したのは合計なので、枚数で割り戻す。小数第 2 位まで）
export function pieceWeightFromTotal(totalWeight: number | null, quantity: number): number | null {
  if (totalWeight === null || quantity <= 0) return null
  return roundTo(totalWeight / quantity, 2)
}

// ------------------------------------------------------------
// 入力の確かめ
// ------------------------------------------------------------

// DB の関数 create_shipment に渡す明細 1 行
export type ShipmentItemPayload = {
  order_item_id: string
  quantity: number
  // 1 枚あたりの実重量の入力（実重量を入力する行で、入力したときだけ）
  piece_weight: number | null
}

export type ShipmentEntryCheck =
  | { ok: true; items: ShipmentItemPayload[] }
  | { ok: false; errors: Record<string, string>; message: string }

// 明細の入力を確かめ、DB の関数に渡す形にする。
//   ・今回の数量は 0 以上の整数で、残りを超えない（0 の行は出さない）
//   ・実重量は、入れたなら正の数
//   ・1 行も出さない送り状は作らない
// errors は明細の id → エラーの文（行の下に出す）
export function checkShipmentEntry(
  items: readonly ShipmentOrderItem[],
  values: Readonly<Record<string, ShipmentEntryValues>>
): ShipmentEntryCheck {
  const errors: Record<string, string> = {}
  const payload: ShipmentItemPayload[] = []
  for (const item of items) {
    const value = values[item.id] ?? { quantity: '', pieceWeight: '' }
    const quantity = parseNumber(value.quantity) ?? 0
    if (!Number.isInteger(quantity) || quantity < 0) {
      errors[item.id] = '今回の数量は 0 以上の整数にしてください'
      continue
    }
    const remaining = remainingQuantity(item)
    if (quantity > remaining) {
      errors[item.id] = `今回の数量が残り（${remaining}）を超えています`
      continue
    }
    if (quantity === 0) continue

    let pieceWeight: number | null = null
    if (needsActualWeightInput(item) && value.pieceWeight.trim() !== '') {
      pieceWeight = parseNumber(value.pieceWeight)
      if (pieceWeight === null || pieceWeight <= 0) {
        errors[item.id] = '実重量は正の数にしてください'
        continue
      }
    }
    payload.push({ order_item_id: item.id, quantity, piece_weight: pieceWeight })
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, message: '明細の入力を直してください' }
  }
  if (payload.length === 0) {
    return { ok: false, errors, message: '今回出す明細がありません（今回の数量を 1 以上にしてください）' }
  }
  return { ok: true, items: payload }
}

// 入力の画面の 1 行の今回の数量と重量（表示用。数にならない入力は 0 枚として数える）
export function entryLine(
  item: ShipmentOrderItem,
  value: ShipmentEntryValues | undefined
): { quantity: number; weights: ShipmentLineWeights } {
  const raw = parseNumber(value?.quantity ?? '') ?? 0
  const quantity = Number.isInteger(raw) && raw > 0 ? raw : 0
  const pieceInput = needsActualWeightInput(item) ? parseNumber(value?.pieceWeight ?? '') : null
  const piece = pieceInput !== null && pieceInput > 0 ? pieceInput : null
  return { quantity, weights: lineWeights(item, quantity, piece) }
}
