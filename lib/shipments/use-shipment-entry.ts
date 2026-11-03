'use client'

// 送り状の入力の画面（/shipments/new）の状態と操作（docs/screen-design.md「送り状発行」の「入力」）。
//
//   ・出荷日（初期値は今日）と、確定でない受注の「納期を確定にする」日付（仮納期なら、その日付を初期値にする）
//   ・明細ごとの今回の数量（初期値は残り）と、実重量を入力する行（アイトレ・ササラ）の 1 枚あたりの実重量
//   ・今回の角重量の合計と、配送の依頼に使う重量（実重量）の合計
//   ・「発行して印刷」: 入力を確かめて発行し、新しいタブで 4 部の印刷の画面を開き、この画面は発行した送り状の確認へ移る
// 入力の確かめ（残りを超えないか など）は shipment-lines.ts の checkShipmentEntry。サーバーでも同じ確かめをする。

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createShipment } from '@/app/(main)/shipments/actions'
import { openBlankShipmentTab, showShipmentInTab } from './print-tab'
import {
  checkShipmentEntry,
  entryLine,
  initialEntryValues,
  sumShipmentWeights,
  type ShipmentEntryValues,
} from './shipment-lines'
import { shipmentViewHref } from './shipment-no'
import type { ShipmentOrder } from './types'

export function useShipmentEntry(params: { order: ShipmentOrder; today: string }) {
  const { order, today } = params
  const router = useRouter()
  // 確定でない納期（仮納期・後報・最短出荷）は、発行と同時に確定にする
  const needsDueDate = order.dueDateType !== '確定'

  const [values, setValues] = useState<Record<string, ShipmentEntryValues>>(() => initialEntryValues(order.items))
  const [shippedDate, setShippedDate] = useState(today)
  const [dueDate, setDueDate] = useState(order.dueDateType === '仮納期' ? (order.dueDate ?? '') : '')
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [dateErrors, setDateErrors] = useState<{ shippedDate?: string; dueDate?: string }>({})
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 明細ごとの今回の数量・重量と、全体の合計（入力のたびに計算し直す）
  const lines = useMemo(
    () => order.items.map((item) => ({ item, ...entryLine(item, values[item.id]) })),
    [order.items, values]
  )
  const totals = useMemo(() => sumShipmentWeights(lines), [lines])

  function updateValue(itemId: string, patch: Partial<ShipmentEntryValues>) {
    setValues((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }))
    // 直した行のエラーは消す
    setItemErrors((current) => {
      if (!(itemId in current)) return current
      const next = { ...current }
      delete next[itemId]
      return next
    })
  }

  // 出荷日・納期の入力の確かめ。エラーがなければ true
  function checkDates(): boolean {
    const errors: { shippedDate?: string; dueDate?: string } = {}
    if (shippedDate === '') errors.shippedDate = '出荷日を入れてください'
    if (needsDueDate && dueDate === '') errors.dueDate = '納期を確定にする日付を入れてください'
    setDateErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function submit() {
    if (submitting) return
    setMessage(null)
    const datesOk = checkDates()
    const checked = checkShipmentEntry(order.items, values)
    if (!checked.ok) setItemErrors(checked.errors)
    if (!datesOk || !checked.ok) {
      setMessage(!checked.ok ? checked.message : '出荷日・納期を入れてください')
      return
    }

    // ポップアップとして止められないよう、ボタンを押した直後に空のタブを開いておく
    const tab = openBlankShipmentTab()
    setSubmitting(true)
    try {
      const result = await createShipment({
        orderNo: order.orderNo,
        orderId: order.id,
        expectedUpdatedAt: order.updatedAt,
        shippedDate,
        dueDate: needsDueDate ? dueDate : null,
        values,
      })
      if (!result.ok) {
        tab?.close()
        setMessage(result.message)
        if (result.errors) setItemErrors(result.errors)
        return
      }
      if (tab) showShipmentInTab(tab, result.shipmentNo)
      // この画面は、発行した送り状の確認へ移る（印刷の画面が開かなかったときは、そこから印刷する）
      router.push(shipmentViewHref(result.shipmentNo, true))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    needsDueDate,
    values,
    lines,
    totals,
    shippedDate,
    setShippedDate,
    dueDate,
    setDueDate,
    itemErrors,
    dateErrors,
    message,
    submitting,
    setQuantity: (itemId: string, text: string) => updateValue(itemId, { quantity: text }),
    setPieceWeight: (itemId: string, text: string) => updateValue(itemId, { pieceWeight: text }),
    submit,
  }
}

export type ShipmentEntry = ReturnType<typeof useShipmentEntry>
