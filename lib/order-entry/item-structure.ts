// 明細の行の並び（材料の行と、それにぶら下がる加工の行）を扱う処理。
//
// 明細は 1 つの配列で持ち、区分が「9 加工」の行を加工の行として扱う。
// 加工の行は、それより上にあるいちばん近い材料の行（母材）にぶら下がる。
//   1  材料の行 ─┐
//   └  加工の行 ─┤ 1 行目の材料にぶら下がる
//   └  加工の行 ─┘
//   2  材料の行
// 行の削除・複写・加工の行の追加で、この親子関係が崩れないようにする
// （docs/screen-design.md「行の操作」）。画面に依存しない純粋な関数にしてテストで確認する。

import { PROCESS_REGION_CODE } from './constants'
import type { ItemRowValues } from './item-types'

// 加工の行か（区分が 9 加工）
export function isProcessRow(row: ItemRowValues): boolean {
  return row.region.trim() === PROCESS_REGION_CODE
}

// 加工の行がぶら下がる材料の行（母材）の位置。なければ -1。
// isSkipped に当てはまる材料の行（何も入力していない行など）は母材にしない
export function parentIndexOf(
  rows: readonly ItemRowValues[],
  index: number,
  isSkipped: (row: ItemRowValues) => boolean = () => false,
): number {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (!isProcessRow(rows[i]) && !isSkipped(rows[i])) {
      return i
    }
  }
  return -1
}

// 材料の行の直後に続く加工の行の、最後の位置（加工の行がなければ材料の行の位置）
export function lastChildIndexOf(rows: readonly ItemRowValues[], materialIndex: number): number {
  let index = materialIndex
  while (index + 1 < rows.length && isProcessRow(rows[index + 1])) {
    index += 1
  }
  return index
}

// 画面の No 欄に出す、材料の行の番号（1 から）。加工の行は null（「└」を表示する）。
// 「空の行で行番号を打ってから *」で、写す材料の行を指定するときにもこの番号を使う
export function materialNumbers(rows: readonly ItemRowValues[]): (number | null)[] {
  let count = 0
  return rows.map((row) => (isProcessRow(row) ? null : (count += 1)))
}

// 行を削除する。材料の行を削除するときは、ぶら下がっている加工の行も一緒に削除する
// （親を失った加工の行が別の材料の行にぶら下がり直すと、気づかないまま誤った受注になるため）
export function removeRowWithChildren(
  rows: readonly ItemRowValues[],
  rowKey: string,
): ItemRowValues[] {
  const index = rows.findIndex((row) => row.key === rowKey)
  if (index < 0) {
    return [...rows]
  }
  const end = isProcessRow(rows[index]) ? index : lastChildIndexOf(rows, index)
  return [...rows.slice(0, index), ...rows.slice(end + 1)]
}

// 加工の行を追加する位置（「+」）。
// 今の行が材料の行ならその材料の、加工の行ならその母材の、最後の加工の行のすぐ下に入れる。
// 母材がない加工の行（先頭など）では、その行のすぐ下に入れる
export function processInsertIndex(rows: readonly ItemRowValues[], rowKey: string): number {
  const index = rows.findIndex((row) => row.key === rowKey)
  if (index < 0) {
    return rows.length
  }
  const materialIndex = isProcessRow(rows[index]) ? parentIndexOf(rows, index) : index
  if (materialIndex < 0) {
    return index + 1
  }
  return lastChildIndexOf(rows, materialIndex) + 1
}

// 材料の行を、ぶら下がっている加工の行ごと、指定した行に写す（「*」）。
//   ・写し先の行は写し元の材料の行の内容になる（行の ID は写し先のまま）
//   ・写し元の加工の行は、新しい行として写し先の材料の行のすぐ下に入る
// newKey は新しい行の ID を作る関数
export function copyMaterialWithChildren(
  rows: readonly ItemRowValues[],
  targetKey: string,
  sourceIndex: number,
  newKey: () => string,
): ItemRowValues[] {
  const targetIndex = rows.findIndex((row) => row.key === targetKey)
  if (targetIndex < 0 || sourceIndex < 0 || sourceIndex >= rows.length) {
    return [...rows]
  }
  const source = rows[sourceIndex]
  const children = rows.slice(sourceIndex + 1, lastChildIndexOf(rows, sourceIndex) + 1)
  const copiedChildren = children.map((child) => ({ ...child, key: newKey() }))
  return [
    ...rows.slice(0, targetIndex),
    { ...source, key: targetKey },
    ...copiedChildren,
    ...rows.slice(targetIndex + 1),
  ]
}

// 材料の行の番号（No 欄の番号）から、配列の位置を求める。見つからなければ -1
export function indexOfMaterialNumber(rows: readonly ItemRowValues[], number: number): number {
  const numbers = materialNumbers(rows)
  return numbers.findIndex((value) => value === number)
}

// 直前の材料の行の位置（「*」で写す材料の行）。今の行より上の材料の行。なければ -1
export function previousMaterialIndex(rows: readonly ItemRowValues[], rowKey: string): number {
  const index = rows.findIndex((row) => row.key === rowKey)
  return index < 0 ? -1 : parentIndexOf(rows, index)
}
