// 送り状の印刷（docs/screen-design.md「送り状の印刷」）。
//
//   /shipments/print?no=26-0001-1-01   4 部（積み込み用・運転手用・受領書・送り状（弊社控え））を A4 の横で印刷する
//   &auto=1                            開いたらすぐに印刷する（送り状の入力の「発行して印刷」から開くとき）
//
// 現場用伝票と同じく、共通レイアウト（ヘッダー・サイドメニュー）を付けないルートグループ app/(print)/ に置く。
// 印刷できるのは事務・管理者だけ（送り状は RLS で事務・管理者だけが読める）。

import Link from 'next/link'
import { ShipmentPrintScreen } from '@/components/shipments/print/shipment-print-screen'
import { todayInJapan } from '@/lib/order-entry/date'
import { getCurrentUser } from '@/lib/auth'
import { paginateSlipLines } from '@/lib/order-slip/slip-pages'
import { loadIssuedShipment } from '@/lib/shipments/load-shipments'
import { buildSheetLines, SHIPMENT_COPIES, SHIPMENT_ROWS_PER_PAGE, sumSheetLines } from '@/lib/shipments/shipment-copies'
import { normalizeShipmentNo, shipmentsHref } from '@/lib/shipments/shipment-no'
import { createClient } from '@/lib/supabase-server'

type PrintShipmentPageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// 印刷できないときの画面（理由と、送り状発行の入口への入口）
function Unavailable({ message }: { message: string }) {
  return (
    <main className="flex flex-1 flex-col items-center bg-canvas px-6 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 rounded border border-line bg-white px-6 py-5">
        <p role="alert" className="text-sm text-neutral-700">
          {message}
        </p>
        <Link href={shipmentsHref()} className="self-end rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-hover">
          送り状発行の入口へ
        </Link>
      </div>
    </main>
  )
}

export default async function PrintShipmentPage({ searchParams }: PrintShipmentPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return <Unavailable message="送り状を印刷する権限がありません。" />
  }

  const shipmentNo = normalizeShipmentNo(typeof params.no === 'string' ? params.no : '')
  if (!shipmentNo) return <Unavailable message="送り状No. は 26-1003-1-01 の形で指定してください。" />

  const supabase = await createClient()
  const shipment = await loadIssuedShipment(supabase, shipmentNo)
  if (!shipment) return <Unavailable message={`送り状No. ${shipmentNo} は見つかりません（取り消された送り状かもしれません）。`} />

  // 部ごとに、行（実重量か角重量か）を組み立てて A4 の横のページに分ける
  const copies = SHIPMENT_COPIES.map((copy) => {
    const lines = buildSheetLines(shipment.lines, copy)
    return { copy, pages: paginateSlipLines(lines, SHIPMENT_ROWS_PER_PAGE), totals: sumSheetLines(lines) }
  })

  return <ShipmentPrintScreen shipment={shipment} copies={copies} issueDate={todayInJapan()} auto={params.auto === '1'} />
}
