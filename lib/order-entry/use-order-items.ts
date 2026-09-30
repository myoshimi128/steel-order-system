'use client'

// 受注明細（材料の行）の入力値と行の操作を管理するカスタムフック。
//
//   ・各行の入力値と、欄を変えたときの連動（定尺の固定・種類に応じた材質・メーカー）
//   ・行の追加・挿入・削除・複写（「*」）
//   ・保存前の確認（validate-order-items.ts）と、保存時に出すエラー
//
// 画面の部品（components/order-entry/items/*）はこのフックの戻り値を表示するだけにする
// （CLAUDE.md「UI実装方針」）。

import { useState } from 'react'
import {
  applyItemFieldChange,
  copyItemRow,
  createEmptyItemRow,
  INITIAL_ITEM_ROW,
} from './item-row'
import type { ItemErrors, ItemFieldName, ItemMasters, ItemRowValues } from './item-types'
import { checkItemRow, validateOrderItems, type OrderItemsValidation } from './validate-order-items'

export function useOrderItems(masters: ItemMasters) {
  const [rows, setRows] = useState<ItemRowValues[]>(() => [createEmptyItemRow()])
  // 保存しようとしたときに出たエラー（画面側の確認・サーバーからの応答）。行の key ごと
  const [submitErrors, setSubmitErrors] = useState<Record<string, ItemErrors>>({})
  // 明細全体のエラー（明細が 1 行もない など）
  const [itemsError, setItemsError] = useState<string | undefined>(undefined)

  // 各行の解釈結果と、入力中から出す警告（描画のたびに計算する）
  const checks = rows.map((row) => checkItemRow(row, masters))

  // 行に表示するエラー: 入力中の警告 ＋ 保存しようとしたときのエラー
  function errorsOf(rowKey: string, index: number): ItemErrors {
    return { ...submitErrors[rowKey], ...checks[index].liveErrors }
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

  // 最後に空の行を追加し、その行の key を返す（数量の後の Enter で次の行がないとき）
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

  // 行を削除し、次にフォーカスを当てる行の key を返す（Ctrl+Delete）。
  // 最後の 1 行を削除した場合は、空の行に置き換える（明細の入力欄が 0 行にならないように）
  function deleteRow(rowKey: string): string {
    const index = rows.findIndex((row) => row.key === rowKey)
    if (rows.length <= 1) {
      const row = createEmptyItemRow()
      setRows([row])
      return row.key
    }
    setRows((current) => current.filter((row) => row.key !== rowKey))
    setSubmitErrors((current) => {
      const next = { ...current }
      delete next[rowKey]
      return next
    })
    // 次の行（なければ前の行）へ移る
    const neighbor = rows[index + 1] ?? rows[index - 1]
    return neighbor.key
  }

  // 直前の行を、指定した行に写す（「*」）。先頭の行では何もしない
  function copyPreviousRow(rowKey: string): boolean {
    const index = rows.findIndex((row) => row.key === rowKey)
    if (index <= 0) {
      return false
    }
    const source = rows[index - 1]
    setRows((current) => current.map((row) => (row.key === rowKey ? copyItemRow(source, rowKey) : row)))
    setSubmitErrors((current) => {
      const next = { ...current }
      delete next[rowKey]
      return next
    })
    return true
  }

  // 保存前の確認。エラーを画面に反映し、確認の結果を返す
  function validate(): OrderItemsValidation {
    const validation = validateOrderItems(rows, masters, INITIAL_ITEM_ROW)
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
    deleteRow,
    copyPreviousRow,
    validate,
    setServerErrors,
    reset,
  }
}

export type OrderItemsState = ReturnType<typeof useOrderItems>
