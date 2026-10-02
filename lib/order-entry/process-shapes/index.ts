// 加工種別の「入力の形」ごとの処理をまとめて、形から引き当てる。
//
// 加工の行の処理（process-row.ts・item-row.ts・保存）は、加工種別の名前ではなく
// 入力の形（process_types.input_shape）で分岐する。形ごとの処理は hole.ts・bend.ts に分け、
// ここで形に応じて呼び分ける。新しい形を追加するときは、形のファイルを作ってここに足す
// （docs/basic-design.md「加工の入力項目」）。

import { DEFAULT_PROCESS_INPUT_SHAPE, type ProcessInputShape } from '../constants'
import type { ItemFieldName, ItemMasters, ItemRowValues } from '../item-types'
import { bendFields, bendSpecFields, checkBendSpec, formatBendSpec } from './bend'
import { checkHoleSpec, formatHoleSpec, HOLE_FIELDS, holeSpecFields } from './hole'
import type { ProcessSpec, ProcessSpecCheck } from './types'

export type { ProcessSpec, ProcessSpecCheck } from './types'

// 加工の行の入力の形。加工方法の番号から加工種別を引き、その入力の形を返す。
// 加工方法が未入力・存在しない番号の間は、自由入力の形として扱う
export function processInputShapeOf(row: ItemRowValues, masters: ItemMasters): ProcessInputShape {
  const code = row.processType.trim()
  const type = masters.processTypes.find(
    (candidate) => candidate.number !== null && String(candidate.number) === code,
  )
  return type?.input_shape ?? DEFAULT_PROCESS_INPUT_SHAPE
}

// 品名の位置に並ぶ入力欄（入力順）
export function specInputFields(shape: ProcessInputShape, row: ItemRowValues): ItemFieldName[] {
  switch (shape) {
    case '穴':
      return [...HOLE_FIELDS]
    case '曲げ':
      return bendFields(row)
    case '自由入力':
      return ['spec']
  }
}

// 数量を自動で求める形か（穴・曲げは母材の枚数から求める。自由入力は手入力）
export function isQuantityAutomatic(shape: ProcessInputShape): boolean {
  return shape !== '自由入力'
}

// 項目の確認と解釈
export function checkProcessSpec(shape: ProcessInputShape, row: ItemRowValues): ProcessSpecCheck {
  switch (shape) {
    case '穴':
      return checkHoleSpec(row)
    case '曲げ':
      return checkBendSpec(row)
    case '自由入力':
      // 加工内容は空欄でもよい（これまでどおり任意）
      return { spec: { shape: '自由入力', text: row.spec.trim() }, errors: {}, liveErrors: {} }
  }
}

// 母材 1 枚あたりの加工の数（数量 = この数 × 母材の枚数）。
//   穴  : 1 枚あたりの孔数
//   曲げ: 1（材料と同じ枚数）
// 自由入力は数量を手入力するため、ここでは使わない
function quantityPerPiece(spec: Exclude<ProcessSpec, { shape: '自由入力' }>): number {
  return spec.shape === '穴' ? spec.holesPerPiece : 1
}

// 自動で求める加工の数量。母材の枚数がまだ決まっていなければ null
export function automaticQuantity(spec: ProcessSpec, parentQuantity: number | null): number | null {
  if (spec.shape === '自由入力' || parentQuantity === null) {
    return null
  }
  return quantityPerPiece(spec) * parentQuantity
}

// 伝票に載せる文（加工内容）。項目から組み立てる（保存はしない）
export function formatProcessSpec(spec: ProcessSpec): string {
  switch (spec.shape) {
    case '穴':
      return formatHoleSpec(spec)
    case '曲げ':
      return formatBendSpec(spec)
    case '自由入力':
      return spec.text
  }
}

// 保存用の JSON（order_item_processes.spec_fields）。自由入力の形は NULL（加工内容は spec 列）
export function specFieldsJson(spec: ProcessSpec) {
  switch (spec.shape) {
    case '穴':
      return holeSpecFields(spec)
    case '曲げ':
      return bendSpecFields(spec)
    case '自由入力':
      return null
  }
}
