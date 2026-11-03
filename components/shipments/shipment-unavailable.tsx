// 送り状の画面を開けないときの知らせ（理由と、送り状発行の入口への入口）。
// 受注が見つからない・削除されている・全部出荷済み・送り状が見つからない などのときに出す。

import Link from 'next/link'
import { shipmentsHref } from '@/lib/shipments/shipment-no'

export function ShipmentUnavailable({ message }: { message: string }) {
  return (
    <main className="flex flex-1 flex-col items-center bg-canvas px-6 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 rounded border border-line bg-white px-6 py-5">
        <p role="alert" className="text-sm text-neutral-700">
          {message}
        </p>
        <Link
          href={shipmentsHref()}
          className="self-end rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
        >
          送り状発行の入口へ
        </Link>
      </div>
    </main>
  )
}
