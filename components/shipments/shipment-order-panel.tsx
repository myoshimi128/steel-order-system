// 送り状の入力・確認の画面の上部（受注の項目。読むだけ）。
//   受注No.・状態 / 得意先（客先担当）・納入先（住所）・工事名 / 納期・配達・加工場所

import { shipmentStatusLabel } from '@/lib/shipments/candidates'
import { customerText, deliveryText, dueDateText } from '@/lib/shipments/shipment-format'
import type { ShipmentOrderHeader } from '@/lib/shipments/types'
import { ShipmentPanelItem as Item } from './shipment-panel-item'

type ShipmentOrderPanelProps = {
  order: ShipmentOrderHeader
  // 受注の残りの合計（状態の「一部出荷（残り n）」に使う）。わからない画面（発行済みの送り状の確認）では省く
  remaining?: number
}

export function ShipmentOrderPanel({ order, remaining }: ShipmentOrderPanelProps) {
  const destination = order.destinationAddress
    ? `${order.destinationName}（${order.destinationAddress}）`
    : order.destinationName

  return (
    <section className="flex flex-col gap-3 rounded border border-line bg-white px-5 py-4">
      <div className="flex items-baseline gap-4">
        <span className="text-xs text-neutral-500">受注No.</span>
        <span className="text-2xl font-bold tabular-nums text-neutral-900">{order.orderNo}</span>
        <span className="rounded bg-canvas px-2 py-0.5 text-xs font-semibold text-neutral-700">
          {remaining === undefined ? order.status : shipmentStatusLabel(order.status, remaining)}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-x-6 gap-y-2">
        <Item label="得意先（客先担当）" value={customerText(order.customerName, order.customerContact)} wide />
        <Item label="納入先" value={destination} wide />
        <Item label="工事名" value={order.projectName} wide />
        <Item label="納期" value={dueDateText(order.dueDateType, order.dueDate)} />
        <Item label="配達" value={deliveryText(order.deliveryMethodName, order.deliveryMethodNote)} />
        <Item label="加工場所" value={order.siteName} />
      </div>
    </section>
  )
}
