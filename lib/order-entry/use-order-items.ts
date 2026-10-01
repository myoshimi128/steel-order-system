'use client'

// 受注明細（材料の行・加工の行）の入力値と行の操作を管理するカスタムフック。
//
//   ・各行の入力値と、欄を変えたときの連動（定尺の固定・種類に応じた材質・メーカー・製鋼法）
//   ・行の追加・挿入・削除（材料の行は加工の行ごと）・複写（「*」）・加工の行の追加（「+」）
//   ・保存前の確認（validate-order-items.ts）と、保存時に出すエラー
//
// 行の並び（材料の行と、それにぶら下がる加工の行）の扱いは item-structure.ts の純粋な関数で行う。
// 画面の部品（components/order-entry/items/*）はこのフックの戻り値を表示するだけにする
// （CLAUDE.md「UI実装方針」）。

import { useState } from 'react'
import {
  applyItemFieldChange,
  createEmptyItemRow,
  createProcessRow,
  INITIAL_ITEM_ROW,
  itemFieldId,
  newItemRowKey,
} from './item-row'
import {
  copyMaterialWithChildren,
  indexOfMaterialNumber,
  isProcessRow,
  previousMaterialIndex,
  processInsertIndex,
  removeRowWithChildren,
} from './item-structure'
import type {
  ItemContext,
  ItemErrors,
  ItemFieldName,
  ItemMasters,
  ItemRowValues,
} from './item-types'
import { checkRows, validateOrderItems, type OrderItemsValidation } from './validate-order-items'

// 「*」の複写の結果。写せなかった場合は理由を返す（画面に案内を出す）
export type CopyRowResult = { ok: true } | { ok: false; message: string }

export function useOrderItems(masters: ItemMasters, context: ItemContext) {
  const [rows, setRows] = useState<ItemRowValues[]>(() => [createEmptyItemRow()])
  // 保存しようとしたときに出たエラー（画面側の確認・サーバーからの応答）。行の key ごと
  const [submitErrors, setSubmitErrors] = useState<Record<string, ItemErrors>>({})
  // 明細全体のエラー（明細が 1 行もない など）
  const [itemsError, setItemsError] = useState<string | undefined>(undefined)

  // 各行の解釈結果と、入力中から出す警告（描画のたびに計算する）。
  // スプライス専用の受注かどうか（context）で、区分の解釈が変わる
  const checks = checkRows(rows, masters, INITIAL_ITEM_ROW, context)

  // 行に表示するエラー: 入力中の警告 ＋ 保存しようとしたときのエラー
  function errorsOf(rowKey: string, index: number): ItemErrors {
    return { ...submitErrors[rowKey], ...checks[index].liveErrors }
  }

  // 指定した行の、保存時のエラーを消す（行の内容が入れ替わったとき）
  function clearRowErrors(rowKey: string) {
    setSubmitErrors((current) => {
      if (!current[rowKey]) {
        return current
      }
      const next = { ...current }
      delete next[rowKey]
      return next
    })
  }

  // 欄の値を変える。連動する欄も合わせて変え、その欄に出ていた保存時のエラーは消す
  function setField(rowKey: string, field: ItemFieldName, value: string) {
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey ? applyItemFieldChange(row, field, value, masters) : row,
      ),
    )
    setSubmitErrors((current) => {
      if (!current[rowKey]?.[field]) {
        return current
      }
      const rowErrors = { ...current[rowKey] }
      delete rowErrors[field]
      return { ...current, [rowKey]: rowErrors }
    })
    setItemsError(undefined)
  }

  // 最後に空の行（材料の行）を追加し、その行の key を返す（最後の行の後の Enter で次の行がないとき）
  function appendRow(): string {
    const row = createEmptyItemRow()
    setRows((current) => [...current, row])
    return row.key
  }

  // 指定した行の前に空の行を挿入し、その行の key を返す（Ctrl+Insert）
  function insertRowBefore(rowKey: string): string {
    const row = createEmptyItemRow()
    setRows((current) => {
      const index = current.findIndex((item) => item.key === rowKey)
      const next = [...current]
      next.splice(index < 0 ? current.length : index, 0, row)
      return next
    })
    return row.key
  }

  // 加工の行を追加し、その行の key を返す（「+」）。
  // 今の行が材料の行ならその材料の、加工の行ならその母材の、最後の加工の行のすぐ下に入れる
  function addProcessRow(rowKey: string): string {
    const row = createProcessRow()
    setRows((current) => {
      const index = processInsertIndex(current, rowKey)
      return [...current.slice(0, index), row, ...current.slice(index)]
    })
    return row.key
  }

  // 行を削除し、次にフォーカスを当てる欄の ID を返す（Ctrl+Delete）。
  // 材料の行を削除するときは、ぶら下がっている加工の行も一緒に削除する。
  // すべての行がなくなる場合は、空の行に置き換える（明細の入力欄が 0 行にならないように）
  function deleteRow(rowKey: string): string {
    const index = rows.findIndex((row) => row.key === rowKey)
    const remaining = removeRowWithChildren(rows, rowKey)
    if (remaining.length === 0) {
      const row = createEmptyItemRow()
      setRows([row])
      setSubmitErrors({})
      return itemFieldId(row.key, 'cuttingMethod')
    }
    setRows(remaining)
    // 削除した行（と加工の行）のエラーを消す
    const removedKeys = new Set(rows.map((row) => row.key))
    for (const row of remaining) {
      removedKeys.delete(row.key)
    }
    setSubmitErrors((current) => {
      const next = { ...current }
      for (const key of removedKeys) {
        delete next[key]
      }
      return next
    })
    // 削除した位置にある行（なければ最後の行）の先頭の欄へ移る。
    // 材料の行の先頭は切断方法、加工の行の先頭は区分
    const next = remaining[index] ?? remaining[remaining.length - 1]
    return itemFieldId(next.key, isProcessRow(next) ? 'region' : 'cuttingMethod')
  }

  // 「*」の複写。
  //   材料の行: 直前の材料の行を、加工の行ごと今の行に写す。
  //             sourceNumber（空の行の切断方法の欄で打った行番号）があれば、その番号の材料の行を写す。
  //             写した加工の行は、今の行のすぐ下に入る
  //   加工の行: 何もしない（同じ材料に同じ加工を 2 行入れることはなく、
  //             「18φ 4つ」のように 1 行にまとめて入力するため、加工の行を写す必要がない）
  function copyRow(rowKey: string, sourceNumber: number | null): CopyRowResult {
    const index = rows.findIndex((row) => row.key === rowKey)
    if (index < 0) {
      return { ok: false, message: '行が見つかりません' }
    }

    if (isProcessRow(rows[index])) {
      return { ok: true }
    }

    const sourceIndex =
      sourceNumber !== null
        ? indexOfMaterialNumber(rows, sourceNumber)
        : previousMaterialIndex(rows, rowKey)
    if (sourceIndex < 0) {
      return {
        ok: false,
        message:
          sourceNumber !== null
            ? `${sourceNumber} 行目の材料の行はありません`
            : '直前に材料の行がありません',
      }
    }
    if (sourceIndex === index) {
      return { ok: false, message: '同じ行には写せません' }
    }
    setRows(copyMaterialWithChildren(rows, rowKey, sourceIndex, newItemRowKey))
    clearRowErrors(rowKey)
    return { ok: true }
  }

  // 保存前の確認。エラーを画面に反映し、確認の結果を返す
  function validate(): OrderItemsValidation {
    const validation = validateOrderItems(rows, masters, INITIAL_ITEM_ROW, context)
    setSubmitErrors(validation.rowErrors)
    setItemsError(validation.itemsError)
    return validation
  }

  // サーバーから返ってきたエラーを画面に反映する
  function setServerErrors(errors: Record<string, ItemErrors> | undefined, error: string | undefined) {
    setSubmitErrors(errors ?? {})
    setItemsError(error)
  }

  // 保存後に次の受注を入力するため、空の 1 行に戻す
  function reset() {
    setRows([createEmptyItemRow()])
    setSubmitErrors({})
    setItemsError(undefined)
  }

  return {
    rows,
    checks,
    errorsOf,
    itemsError,
    setField,
    appendRow,
    insertRowBefore,
    addProcessRow,
    deleteRow,
    copyRow,
    validate,
    setServerErrors,
    reset,
  }
}

export type OrderItemsState = ReturnType<typeof useOrderItems>
