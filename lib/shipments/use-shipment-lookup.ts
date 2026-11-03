'use client'

// 送り状発行の入口の、受注No.・送り状No. で呼び出す欄の状態と操作。
//   受注No.（26-1003-1）を打って Enter → その受注の送り状の入力（/shipments/new）
//   送り状No.（26-1003-1-01）を打って Enter → 発行済みの送り状の確認（/shipments/view）
// 打った番号は lib/order-entry/order-no.ts・shipment-no.ts の決まりでそろえる（ハイフンなし・空白区切りも受け付ける）。

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { normalizeOrderNo } from '@/lib/order-entry/order-no'
import { normalizeShipmentNo, shipmentNewHref, shipmentViewHref } from './shipment-no'

export function useShipmentLookup() {
  const router = useRouter()
  const [orderNo, setOrderNoText] = useState('')
  const [shipmentNo, setShipmentNoText] = useState('')
  const [orderNoError, setOrderNoError] = useState<string | null>(null)
  const [shipmentNoError, setShipmentNoError] = useState<string | null>(null)

  function openOrder() {
    const normalized = normalizeOrderNo(orderNo)
    if (!normalized) {
      setOrderNoError('受注No. は 26-1003-1 の形で入力してください')
      return
    }
    router.push(shipmentNewHref(normalized))
  }

  function openShipment() {
    const normalized = normalizeShipmentNo(shipmentNo)
    if (!normalized) {
      setShipmentNoError('送り状No. は 26-1003-1-01 の形で入力してください')
      return
    }
    router.push(shipmentViewHref(normalized))
  }

  return {
    orderNo,
    shipmentNo,
    orderNoError,
    shipmentNoError,
    setOrderNo: (value: string) => {
      setOrderNoText(value)
      setOrderNoError(null)
    },
    setShipmentNo: (value: string) => {
      setShipmentNoText(value)
      setShipmentNoError(null)
    },
    openOrder,
    openShipment,
  }
}
