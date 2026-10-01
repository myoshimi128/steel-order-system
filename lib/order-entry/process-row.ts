// 加工の行（区分「9 加工」の行）の解釈・確認・仕入金額の計算。
//
// 加工の行は、それより上にあるいちばん近い材料の行（母材）にぶら下がる（item-structure.ts）。
// 仕入単価は MVP では手入力で、空欄のまま登録できる（単価未定として数える）。
//   単位 個: 仕入金額 = 仕入単価 × 数量
//   単位 kg: 仕入金額 = 仕入単価 × 母材の合計重量（母材の単価の根拠にした重量。角重量、ササラは使用材重量）
// 円未満は切り上げる（docs/basic-design.md「明細金額」）。

import { findCodeOption } from '@/lib/code-input/code-option'
import { ceilToYen } from '@/lib/pricing/rounding'
import { calcTotalWeight } from '@/lib/pricing/weight'
import type { ItemCalculation } from './calculate-item'
import { PROCESS_PRICE_UNIT_OPTIONS, type ProcessPriceUnit } from './constants'
import { processTypeOptions } from './item-options'
import type { ItemErrors, ItemMasters, ItemRowValues } from './item-types'
import { parseQuantity } from './resolve-item'

export type ResolvedProcess = {
  processTypeId: string | null
  spec: string
  quantity: number | null
  priceUnit: ProcessPriceUnit | null
  // 空欄（単価未定）は null
  unitPrice: number | null
  // 仕入単価の欄に何か入力されているか（入力されていて数値でない場合のエラーに使う）
  unitPriceEntered: boolean
}

// 仕入単価として読み取る（0 以上の数。小数可）。空欄・数値でないものは null
function parseUnitPrice(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return null
  }
  return Number(trimmed)
}

export function resolveProcessRow(row: ItemRowValues, masters: ItemMasters): ResolvedProcess {
  return {
    processTypeId: findCodeOption(processTypeOptions(masters), row.processType)?.value ?? null,
    spec: row.spec.trim(),
    quantity: parseQuantity(row.quantity),
    priceUnit: findCodeOption(PROCESS_PRICE_UNIT_OPTIONS, row.priceUnit)?.value ?? null,
    unitPrice: parseUnitPrice(row.unitPrice),
    unitPriceEntered: row.unitPrice.trim() !== '',
  }
}

export type ProcessRowCheck = {
  resolved: ResolvedProcess
  errors: ItemErrors
  liveErrors: ItemErrors
}

// 加工の行の確認。hasParent は、この行より上に材料の行（母材）があるか
export function checkProcessRow(
  row: ItemRowValues,
  masters: ItemMasters,
  hasParent: boolean,
): ProcessRowCheck {
  const resolved = resolveProcessRow(row, masters)
  const errors: ItemErrors = {}
  const liveErrors: ItemErrors = {}

  // 加工の行は材料の行にぶら下がるため、材料の行より前（明細の先頭）には置けない
  if (!hasParent) {
    liveErrors.region = '加工の行は材料の行の下に置いてください'
  }

  if (!row.processType.trim()) {
    errors.processType = '加工方法を選択してください'
  } else if (!resolved.processTypeId) {
    liveErrors.processType = '存在しない番号です'
  }

  if (!row.quantity.trim()) {
    errors.quantity = '加工の数量を入力してください'
  } else if (resolved.quantity === null) {
    liveErrors.quantity = '数量は 1 以上の整数で入力してください'
  }

  if (!row.priceUnit.trim()) {
    errors.priceUnit = '単位を選択してください'
  } else if (!resolved.priceUnit) {
    liveErrors.priceUnit = '存在しない番号です'
  }

  // 仕入単価は空欄でよい（単価未定）。入力されている場合は数値であること
  if (resolved.unitPriceEntered && resolved.unitPrice === null) {
    liveErrors.unitPrice = '仕入単価は 0 以上の数で入力してください'
  }

  return { resolved, errors: { ...errors, ...liveErrors }, liveErrors }
}

// 加工の行の仕入金額の計算結果
export type ProcessCalculation =
  // 入力がそろっていない（数量・単位がない、kg 単位で母材の重量がまだ求まらない など）
  | { status: 'incomplete' }
  // 仕入単価が空欄（単価未定）
  | { status: 'unpriced' }
  | { status: 'priced'; amount: number }

// 母材（材料の行）の、単価の根拠にした重量の合計。重量が求まっていなければ null
// （角重量。ササラは使用材重量。表示用の実重量ではない）。
// 母材の単価が未確定・別途見積もりでも、重量が求まっていれば使う
export function parentBillingTotalWeight(
  parent: ItemCalculation | undefined,
  parentQuantity: number | null,
): number | null {
  if (!parent?.weight || parentQuantity === null) {
    return null
  }
  const { weights } = parent.weight
  const pieceWeight = weights.materialWeight ?? weights.squareWeight
  return calcTotalWeight(pieceWeight, parentQuantity)
}

export function calculateProcess(
  process: ResolvedProcess,
  parentTotalWeight: number | null,
): ProcessCalculation {
  if (process.quantity === null || process.priceUnit === null) {
    return { status: 'incomplete' }
  }
  if (process.unitPrice === null) {
    return { status: 'unpriced' }
  }
  if (process.priceUnit === '個') {
    return { status: 'priced', amount: ceilToYen(process.unitPrice * process.quantity) }
  }
  if (parentTotalWeight === null) {
    return { status: 'incomplete' }
  }
  return { status: 'priced', amount: ceilToYen(process.unitPrice * parentTotalWeight) }
}
