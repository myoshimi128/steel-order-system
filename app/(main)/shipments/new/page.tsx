// 送り状の入力（docs/screen-design.md「送り状発行」の「入力」）。
//
//   /shipments/new?order=26-0001-1   この受注の送り状を作る（今回の数量・実重量・出荷日・納期の確定）
// 送り状発行の入口（/shipments）で受注No. を打つか、一覧の行を押して開く。
// 開けないとき（見つからない・削除済み・全部出荷済み）は、理由と入口への案内を出す。
// 送り状を発行できるのは事務・管理者だけ（DB の関数 create_shipment の中でも確かめる）。

import { ShipmentEntryScreen } from '@/components/shipments/shipment-entry-screen'
import { ShipmentUnavailable } from '@/components/shipments/shipment-unavailable'
import { getCurrentUser } from '@/lib/auth'
import { todayInJapan } from '@/lib/order-entry/date'
import { normalizeOrderNo } from '@/lib/order-entry/order-no'
import { loadShipmentOrder } from '@/lib/shipments/load-shipments'
import { totalRemaining } from '@/lib/shipments/shipment-lines'
import { createClient } from '@/lib/supabase-server'

type NewShipmentPageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewShipmentPage({ searchParams }: NewShipmentPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return <ShipmentUnavailable message="送り状を発行する権限がありません。" />
  }

  const orderNo = normalizeOrderNo(typeof params.order === 'string' ? params.order : '')
  if (!orderNo) return <ShipmentUnavailable message="受注No. は 26-1003-1 の形で指定してください。" />

  const supabase = await createClient()
  const order = await loadShipmentOrder(supabase, orderNo)
  if (!order) return <ShipmentUnavailable message={`受注No. ${orderNo} は見つかりません。`} />
  if (order.deleted) return <ShipmentUnavailable message={`受注No. ${orderNo} は削除されています。`} />
  if (order.items.length === 0 || totalRemaining(order.items) === 0) {
    return (
      <ShipmentUnavailable
        message={`受注No. ${orderNo} は全部出荷済みです。発行した送り状は、入口で送り状No. を打って呼び出せます。`}
      />
    )
  }

  return (
    // key に受注の更新日時と送り状の数を付け、発行・取り消しの後に開き直したら入力の状態を作り直す
    <ShipmentEntryScreen key={`${order.updatedAt}:${order.shipments.length}`} order={order} today={todayInJapan()} />
  )
}
