// この受注について発行済みの送り状（入力の画面の右上）。分納の 2 回目以降に、前の回を確かめられるようにする。
// 送り状No. を押すと、その送り状の確認の画面（印刷し直し・取り消し）を開く。

import Link from 'next/link'
import { formatDisplayDate } from '@/lib/order-entry/date'
import { quantityText } from '@/lib/shipments/shipment-format'
import { shipmentViewHref } from '@/lib/shipments/shipment-no'
import type { ShipmentSummary } from '@/lib/shipments/types'

export function ShipmentHistory({ shipments }: { shipments: readonly ShipmentSummary[] }) {
  return (
    <section className="flex w-80 shrink-0 flex-col rounded border border-line bg-white px-4 py-3">
      <h2 className="text-sm font-semibold text-neutral-700">この受注の送り状</h2>
      {shipments.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">まだ発行していません（今回が 1 回目）</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1 text-sm">
          {shipments.map((shipment) => (
            <li key={shipment.id} className="flex items-baseline justify-between gap-2">
              <Link href={shipmentViewHref(shipment.shipmentNo)} className="font-semibold tabular-nums text-navy hover:underline">
                {shipment.shipmentNo}
              </Link>
              <span className="text-xs tabular-nums text-neutral-500">
                {formatDisplayDate(shipment.shippedDate)}・{quantityText(shipment.totalQuantity)} 枚
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
