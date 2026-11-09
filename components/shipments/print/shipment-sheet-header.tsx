// 送り状の 1 ページの上部（どの部・どのページにも同じものを出す）。
//
//   1 段目: 部の名前（積み込み用 など。大きく）/ 送り状No.（大きく）・出荷日 / 受注No.・ページ
//   2 段目: 得意先（客先担当）・納入先・納入先の住所・工事名
//   3 段目: 納期・配達・加工場所・発行日
// 部の名前は、重ねた 4 部を渡し間違えないよう、いちばん目立つ位置に黒地に白で出す（白黒で印刷しても読めるように）。

import { SlipField } from '@/components/order-slip/slip-field'
import { formatDisplayDate } from '@/lib/order-entry/date'
import type { ShipmentCopy } from '@/lib/shipments/shipment-copies'
import { customerText, deliveryText, dueDateText } from '@/lib/shipments/shipment-format'
import type { IssuedShipment } from '@/lib/shipments/types'

type ShipmentSheetHeaderProps = {
  shipment: IssuedShipment
  copy: ShipmentCopy
  issueDate: string
  pageNo: number
  pageCount: number
}

export function ShipmentSheetHeader({ shipment, copy, issueDate, pageNo, pageCount }: ShipmentSheetHeaderProps) {
  const order = shipment.order

  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="shrink-0 rounded bg-neutral-900 px-3 py-1 text-2xl font-black tracking-widest text-white">
          {copy.title}
        </h1>

        <div className="flex items-baseline gap-6">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-neutral-600">送り状No.</span>
            <span className="text-3xl font-bold tabular-nums tracking-wide text-neutral-900">{shipment.shipmentNo}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-neutral-600">出荷日</span>
            <span className="text-2xl font-bold tabular-nums text-neutral-900">{formatDisplayDate(shipment.shippedDate)}</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end text-xs leading-tight text-neutral-700">
          <span>受注No. {order.orderNo}</span>
          <span className="tabular-nums">
            {pageNo} / {pageCount} ページ
          </span>
        </div>
      </div>

      <div className="flex border border-neutral-900">
        <SlipField label="得意先（客先担当）" value={customerText(order.customerName, order.customerContact)} wide />
        <SlipField label="納入先" value={order.destinationName} wide />
        <SlipField label="納入先の住所" value={order.destinationAddress} wide />
        <SlipField label="工事名" value={order.projectName} wide />
      </div>
      <div className="flex border border-neutral-900">
        <SlipField label="納期" value={dueDateText(order.dueDateType, order.dueDate)} />
        <SlipField label="配達" value={deliveryText(order.deliveryMethodName, order.deliveryMethodNote)} />
        <SlipField label="加工場所" value={order.siteName} />
        <SlipField label="発行日" value={formatDisplayDate(issueDate)} />
      </div>
    </header>
  )
}
