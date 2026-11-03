'use client'

// 送り状の印刷の画面（/shipments/print）。
// 上に操作の帯（画面だけ）、その下に 4 部のページ（A4 の横）を部の順に並べる。印刷するとページだけが出る。
// 部ごとの行・ページ分け・合計はサーバー（page.tsx）で組み立てて渡し、ここでは印刷の流れ（use-shipment-print.ts）だけを持つ。

import Link from 'next/link'
import type { ShipmentCopyPages } from '@/lib/shipments/shipment-copies'
import { shipmentViewHref } from '@/lib/shipments/shipment-no'
import type { IssuedShipment } from '@/lib/shipments/types'
import { useShipmentPrint } from '@/lib/shipments/use-shipment-print'
import { ShipmentSheet } from './shipment-sheet'

type ShipmentPrintScreenProps = {
  shipment: IssuedShipment
  copies: ShipmentCopyPages[]
  issueDate: string
  auto: boolean
}

export function ShipmentPrintScreen({ shipment, copies, issueDate, auto }: ShipmentPrintScreenProps) {
  const { print } = useShipmentPrint(auto)
  const pageCount = copies.reduce((sum, copy) => sum + copy.pages.length, 0)

  return (
    <main className="flex flex-1 flex-col gap-4 bg-canvas px-6 py-5 print:block print:bg-white print:p-0">
      <div className="flex items-center gap-4 rounded border border-line bg-white px-5 py-3 print:hidden">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">送り状の印刷（4 部・{pageCount} 枚）</span>
          <span className="text-lg font-bold tabular-nums text-neutral-900">送り状No. {shipment.shipmentNo}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href={shipmentViewHref(shipment.shipmentNo)}
            className="rounded border border-line bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-canvas"
          >
            送り状の確認へ
          </Link>
          <button
            type="button"
            onClick={print}
            className="rounded bg-navy px-6 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
          >
            印刷
          </button>
        </div>
      </div>

      <div className="slip-sheets flex flex-col items-center gap-6">
        {copies.map(({ copy, pages, totals }) =>
          pages.map((lines, index) => (
            <ShipmentSheet
              key={`${copy.kind}-${index}`}
              shipment={shipment}
              copy={copy}
              lines={lines}
              totals={totals}
              issueDate={issueDate}
              pageNo={index + 1}
              pageCount={pages.length}
            />
          ))
        )}
      </div>
    </main>
  )
}
