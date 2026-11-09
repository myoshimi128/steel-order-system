// 発行済みの送り状の確認（docs/screen-design.md「送り状発行」の「確認・取り消し」）。
//
//   /shipments/view?no=26-0001-1-01   送り状の中身を確かめ、印刷し直す・取り消す
//   &issued=1                         発行した直後（お知らせを出す）
// 送り状発行の入口で送り状No. を打つか、送り状の入力の画面の「この受注の送り状」から開く。
// 取り消せるのは事務・管理者だけ（DB の関数 delete_shipment の中でも確かめる）。

import { ShipmentUnavailable } from '@/components/shipments/shipment-unavailable'
import { ShipmentViewScreen } from '@/components/shipments/shipment-view-screen'
import { getCurrentUser } from '@/lib/auth'
import { loadIssuedShipment } from '@/lib/shipments/load-shipments'
import { normalizeShipmentNo } from '@/lib/shipments/shipment-no'
import { createClient } from '@/lib/supabase-server'

type ShipmentViewPageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShipmentViewPage({ searchParams }: ShipmentViewPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return <ShipmentUnavailable message="送り状を見る権限がありません。" />
  }

  const shipmentNo = normalizeShipmentNo(typeof params.no === 'string' ? params.no : '')
  if (!shipmentNo) return <ShipmentUnavailable message="送り状No. は 26-1003-1-01 の形で指定してください。" />

  const supabase = await createClient()
  const shipment = await loadIssuedShipment(supabase, shipmentNo)
  if (!shipment) {
    return <ShipmentUnavailable message={`送り状No. ${shipmentNo} は見つかりません（取り消された送り状かもしれません）。`} />
  }

  return <ShipmentViewScreen shipment={shipment} issued={params.issued === '1'} />
}
