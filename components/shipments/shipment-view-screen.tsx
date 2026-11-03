'use client'

// 発行済みの送り状の確認の画面（/shipments/view?no=26-0001-1-01。docs/screen-design.md「送り状発行」の「確認・取り消し」）。
//
//   上: 発行した直後のお知らせ（印刷の画面が開かなかったときの案内）
//   中: 送り状No.・出荷日・発行した人と日時、受注の項目、明細（今回の数量・角重量・実重量）と合計
//   下: 「入口に戻る」「続けてこの受注の送り状を作る」（残りがあるとき）「取り消す」「印刷（4 部）」
// 事務所の画面なので、角重量（請求の根拠）と実重量（配送の依頼）の両方を出す。操作は useShipmentView。

import Link from 'next/link'
import { formatDisplayDate } from '@/lib/order-entry/date'
import { formatJapanDateTime } from '@/lib/order-slip/slip-format'
import { issuedLineWeights, sumShipmentWeights } from '@/lib/shipments/shipment-lines'
import { shipmentNewHref, shipmentsHref } from '@/lib/shipments/shipment-no'
import type { IssuedShipment } from '@/lib/shipments/types'
import { useShipmentView } from '@/lib/shipments/use-shipment-view'
import { IssuedLinesTable } from './issued-lines-table'
import { ShipmentOrderPanel } from './shipment-order-panel'
import { ShipmentTotalsBar } from './shipment-totals-bar'

type ShipmentViewScreenProps = {
  shipment: IssuedShipment
  // 発行した直後に開いたか（お知らせを出す）
  issued: boolean
}

export function ShipmentViewScreen({ shipment, issued }: ShipmentViewScreenProps) {
  const view = useShipmentView(shipment)
  const totals = sumShipmentWeights(
    shipment.lines.map((line) => ({ quantity: line.quantity, weights: issuedLineWeights(line) }))
  )
  // 完了していなければ、残りの送り状を続けて作れる
  const canContinue = shipment.order.status !== '完了'

  return (
    <main className="flex flex-1 flex-col gap-4 bg-canvas px-5 py-5">
      <div>
        <p className="text-sm text-neutral-500">発行した送り状の中身を確かめ、印刷し直したり取り消したりします</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">送り状の確認</h1>
      </div>

      {issued && (
        <p role="status" className="rounded border border-navy/20 bg-navy-soft px-4 py-2.5 text-sm font-semibold text-navy">
          送り状No. {shipment.shipmentNo} を発行しました。印刷の画面が開かなかったときは「印刷（4 部）」を押してください
        </p>
      )}
      {view.error && (
        <p role="alert" className="rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent">
          {view.error}
        </p>
      )}

      <section className="flex items-baseline gap-8 rounded border border-line bg-white px-5 py-4">
        <div className="flex items-baseline gap-3">
          <span className="text-xs text-neutral-500">送り状No.</span>
          <span className="text-2xl font-bold tabular-nums text-neutral-900">{shipment.shipmentNo}</span>
        </div>
        <span className="text-sm text-neutral-700">
          出荷日 <span className="font-semibold tabular-nums">{formatDisplayDate(shipment.shippedDate)}</span>
        </span>
        <span className="ml-auto text-xs text-neutral-500">
          発行 {formatJapanDateTime(shipment.createdAt)}
          {shipment.createdByName ? `（${shipment.createdByName}）` : ''}
        </span>
      </section>

      <ShipmentOrderPanel order={shipment.order} />

      <section className="flex min-h-0 flex-1 flex-col rounded border border-line bg-white">
        <IssuedLinesTable lines={shipment.lines} />
        <ShipmentTotalsBar totals={totals} />
      </section>

      <div className="flex items-center justify-end gap-3">
        <Link href={shipmentsHref()} className="rounded border border-line bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-canvas">
          入口に戻る
        </Link>
        {canContinue && (
          <Link
            href={shipmentNewHref(shipment.order.orderNo)}
            className="rounded border border-navy bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-navy-soft"
          >
            続けてこの受注の送り状を作る
          </Link>
        )}
        <button
          type="button"
          onClick={view.cancel}
          disabled={view.pending}
          className="rounded border border-line bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-canvas disabled:opacity-60"
        >
          {view.pending ? '取り消しています…' : '取り消す'}
        </button>
        <button
          type="button"
          onClick={view.print}
          className="rounded bg-navy px-6 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
        >
          印刷（4 部）
        </button>
      </div>
    </main>
  )
}
