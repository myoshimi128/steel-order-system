'use client'

// 発行済みの送り状の確認の画面（/shipments/view）の操作。
//   ・印刷: 新しいタブで 4 部の印刷の画面を開く
//   ・取り消し: 確かめてから送り状を取り消し（DB の関数 delete_shipment）、入口に戻って結果を知らせる
// 取り消すと、受注の状態は出荷の実績から付け直す（送り状がなくなれば出荷待ち）。番号と確定にした納期は戻さない。

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteShipment } from '@/app/(main)/shipments/actions'
import { openShipmentPrintTab } from './print-tab'
import { shipmentsHref } from './shipment-no'
import type { IssuedShipment } from './types'

export function useShipmentView(shipment: IssuedShipment) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function print() {
    setError(null)
    if (!openShipmentPrintTab(shipment.shipmentNo)) setError('印刷の画面を開けませんでした（ブラウザに止められました）')
  }

  function cancel() {
    const ok = window.confirm(
      [
        `送り状No. ${shipment.shipmentNo} を取り消します。`,
        '配った送り状（4 部）は回収して捨ててください。',
        'この送り状No. は使い回しません（次に発行する送り状は次の番号になります）。',
        '確定にした納期は戻りません。',
        'よろしいですか？',
      ].join('\n')
    )
    if (!ok) return
    setError(null)
    startTransition(async () => {
      const result = await deleteShipment(shipment.id)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.push(shipmentsHref({ notice: 'deleted', no: shipment.shipmentNo }))
    })
  }

  return { pending, error, print, cancel }
}
