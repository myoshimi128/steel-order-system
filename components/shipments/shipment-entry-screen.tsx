'use client'

// 送り状の入力の画面（/shipments/new?order=26-0001-1。docs/screen-design.md「送り状発行」の「入力」）。
//
//   上: 受注の項目（読むだけ）と、この受注の送り状（分納の前の回）
//   中: 出荷日・納期を確定にする（確定でない受注だけ）
//   下: 明細の表（今回の数量・実重量）と合計
//   最後: 「入口に戻る」「発行して印刷」
// Enter で 出荷日 → 納期 → 明細の今回の数量 → 実重量 1 枚（入力する行だけ）→ … → 発行して印刷 と進む（テンキー中心）。
// 状態と操作は useShipmentEntry（lib/shipments/use-shipment-entry.ts）。

import Link from 'next/link'
import { useEffect } from 'react'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { quantityFieldId, weightFieldId } from '@/lib/shipments/field-ids'
import { needsActualWeightInput, remainingQuantity, totalRemaining } from '@/lib/shipments/shipment-lines'
import { shipmentsHref } from '@/lib/shipments/shipment-no'
import type { ShipmentOrder } from '@/lib/shipments/types'
import { useShipmentEntry } from '@/lib/shipments/use-shipment-entry'
import { ShipmentDateFields } from './shipment-date-fields'
import { ShipmentHistory } from './shipment-history'
import { ShipmentItemsTable } from './shipment-items-table'
import { ShipmentOrderPanel } from './shipment-order-panel'

type ShipmentEntryScreenProps = {
  order: ShipmentOrder
  today: string
}

const SUBMIT_ID = 'shipment-submit'

export function ShipmentEntryScreen({ order, today }: ShipmentEntryScreenProps) {
  const entry = useShipmentEntry({ order, today })

  // Enter で進む欄の順（残りが 0 の行・実重量を入力しない行の欄は出さないので、飛ばされる）
  const fieldOrder = [
    'shippedDate',
    'dueDate',
    ...order.items
      .filter((item) => remainingQuantity(item) > 0)
      .flatMap((item) =>
        needsActualWeightInput(item) ? [quantityFieldId(item.id), weightFieldId(item.id)] : [quantityFieldId(item.id)]
      ),
    SUBMIT_ID,
  ]
  const navigation = useFieldNavigation(fieldOrder)

  // 開いたら、出荷日の欄にカーソルを置く
  const { focusField } = navigation
  useEffect(() => {
    focusField('shippedDate')
  }, [focusField])

  return (
    <main className="flex flex-1 flex-col gap-4 bg-canvas px-5 py-5" onKeyDown={navigation.handleArrowKeys}>
      <div>
        <p className="text-sm text-neutral-500">今回出す数量を入れて、送り状を発行します（残りを減らせば分納になります）</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">送り状の入力</h1>
      </div>

      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <ShipmentOrderPanel order={order} remaining={totalRemaining(order.items)} />
        </div>
        <ShipmentHistory shipments={order.shipments} />
      </div>

      <ShipmentDateFields
        entry={entry}
        navigation={navigation}
        today={today}
        dueDateType={order.dueDateType}
        dueDate={order.dueDate}
      />

      <ShipmentItemsTable entry={entry} navigation={navigation} />

      {entry.message && (
        <p role="alert" className="rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent">
          {entry.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link
          href={shipmentsHref()}
          tabIndex={-1}
          className="rounded border border-line bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-canvas"
        >
          入口に戻る
        </Link>
        <button
          id={SUBMIT_ID}
          ref={navigation.register(SUBMIT_ID)}
          type="button"
          onClick={() => void entry.submit()}
          disabled={entry.submitting}
          className="rounded bg-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
        >
          {entry.submitting ? '発行しています…' : '発行して印刷'}
        </button>
      </div>
    </main>
  )
}
