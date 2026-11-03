// 送り状を作れる受注の一覧の 1 行。行を押すと、その受注の送り状の入力を開く。
//   列: 至急・納期・受注No.・得意先・納入先・工事名・配達・状態・残り

import Link from 'next/link'
import { shipmentStatusLabel, type ShipmentCandidate } from '@/lib/shipments/candidates'
import { deliveryText, dueDateText, quantityText } from '@/lib/shipments/shipment-format'
import { shipmentNewHref } from '@/lib/shipments/shipment-no'

const CELL = 'truncate px-2 py-2.5'

export function ShipmentCandidateRow({ row }: { row: ShipmentCandidate }) {
  const href = shipmentNewHref(row.orderNo)
  return (
    <tr className="border-t border-line hover:bg-canvas">
      <td className="px-3 py-2.5">
        {row.isUrgent && <span className="rounded bg-urgent px-1.5 py-0.5 text-[11px] font-bold text-white">至急</span>}
      </td>
      <td className={`${CELL} tabular-nums ${row.dueDateType === '最短出荷' ? 'font-bold text-attention' : ''}`}>
        {dueDateText(row.dueDateType, row.dueDate)}
      </td>
      <td className={`${CELL} font-semibold tabular-nums`}>
        <Link href={href} className="text-navy hover:underline">
          {row.orderNo}
        </Link>
      </td>
      <td className={CELL}>{row.customerName}</td>
      <td className={CELL}>{row.destinationName}</td>
      <td className={CELL}>{row.projectName ?? ''}</td>
      <td className={CELL}>{deliveryText(row.deliveryMethodName, row.deliveryMethodNote)}</td>
      <td className={`${CELL} text-xs`}>{shipmentStatusLabel(row.status, row.remainingQuantity)}</td>
      <td className={`${CELL} text-right tabular-nums`}>
        {quantityText(row.remainingQuantity)} / {quantityText(row.orderedQuantity)}
      </td>
      <td className="px-2 py-2">
        <Link
          href={href}
          className="block rounded border border-navy px-2 py-1 text-center text-xs font-semibold text-navy hover:bg-navy-soft"
        >
          送り状を作る
        </Link>
      </td>
    </tr>
  )
}
