// 送り状の 1 ページ（A4 の横）。4 部それぞれを、このページの形で印刷する。
//
//   上: 上部の項目（ShipmentSheetHeader。どのページにも出す）
//   左: 明細の表（ShipmentSheetTable）と、その下の合計（最後のページ）か「次のページに続きます」
//   右: 受領書・送り状はお客様のサインの欄（ShipmentSignBox）、積み込み用・運転手用は配送の欄（ShipmentDeliveryBox）
// 大きさは現場用伝票と同じ決まり（app/globals.css の .slip-sheet）で、画面でも印刷と同じ大きさで見せる。

import type { ShipmentCopy, ShipmentSheetLine, ShipmentSheetTotals } from '@/lib/shipments/shipment-copies'
import { deliveryText, quantityText, weightText } from '@/lib/shipments/shipment-format'
import type { IssuedShipment } from '@/lib/shipments/types'
import { ShipmentDeliveryBox } from './shipment-delivery-box'
import { ShipmentSheetHeader } from './shipment-sheet-header'
import { ShipmentSheetTable } from './shipment-sheet-table'
import { ShipmentSignBox } from './shipment-sign-box'

type ShipmentSheetProps = {
  shipment: IssuedShipment
  copy: ShipmentCopy
  lines: readonly ShipmentSheetLine[]
  // この部の合計（数量・重量・角重量で代わりに数えた行数）
  totals: ShipmentSheetTotals
  issueDate: string
  pageNo: number
  pageCount: number
}

export function ShipmentSheet({ shipment, copy, lines, totals, issueDate, pageNo, pageCount }: ShipmentSheetProps) {
  const isLastPage = pageNo === pageCount
  const weightLabel = copy.weight === 'actual' ? '実重量' : '角重量'
  const order = shipment.order

  return (
    <section className="slip-sheet flex flex-col gap-2 bg-white text-neutral-900">
      <ShipmentSheetHeader shipment={shipment} copy={copy} issueDate={issueDate} pageNo={pageNo} pageCount={pageCount} />

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <ShipmentSheetTable lines={lines} weightLabel={weightLabel} />
          {isLastPage ? (
            <div className="mt-1 flex justify-end gap-6 text-sm">
              <span>
                数量の合計 <span className="font-bold tabular-nums">{quantityText(totals.quantity)}</span>
              </span>
              <span>
                {weightLabel}の合計 <span className="font-bold tabular-nums">{weightText(totals.weight)}</span> kg
              </span>
            </div>
          ) : (
            <p className="mt-1 text-right text-sm font-semibold">次のページに続きます</p>
          )}
        </div>

        <div className="flex w-[70mm] shrink-0 flex-col">
          {copy.signature ? (
            <ShipmentSignBox />
          ) : (
            <ShipmentDeliveryBox
              delivery={deliveryText(order.deliveryMethodName, order.deliveryMethodNote)}
              totalWeight={isLastPage ? totals.weight : null}
              estimatedCount={totals.estimatedCount}
            />
          )}
        </div>
      </div>
    </section>
  )
}
