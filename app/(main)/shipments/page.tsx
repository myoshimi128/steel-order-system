// 送り状発行の入口（サイドメニューの「送り状発行」。docs/screen-design.md「送り状発行」の「入口」）。
//
//   /shipments                       受注No.・送り状No. で呼び出す欄と、送り状を作れる受注の一覧
//   ?site=a                          加工場所のタブ（営業所のコード。指定がなければログイン中のユーザーの営業所）
//   ?notice=deleted&no=26-1-1-01     送り状を取り消した後のお知らせ
// 送り状を作れるのは、削除しておらず完了していない受注（加工待ちも含む）。画面の中身は ShipmentHomeScreen。

import { ShipmentHomeScreen } from '@/components/shipments/shipment-home-screen'
import { ShipmentUnavailable } from '@/components/shipments/shipment-unavailable'
import { getCurrentUser } from '@/lib/auth'
import { loadSiteTabs } from '@/lib/intake/load-sites'
import { countBySite, selectSiteTab } from '@/lib/intake/site-tabs'
import { sortCandidates } from '@/lib/shipments/candidates'
import { loadShipmentCandidates } from '@/lib/shipments/load-shipments'
import { shipmentsNoticeText } from '@/lib/shipments/shipment-no'
import { createClient } from '@/lib/supabase-server'

type ShipmentsPageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ShipmentsPage({ searchParams }: ShipmentsPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  // 送り状は事務の業務（RLS でも、現場は送り状を読めない）
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return <ShipmentUnavailable message="この画面を開く権限がありません。" />
  }

  const supabase = await createClient()
  const [candidates, sites] = await Promise.all([loadShipmentCandidates(supabase), loadSiteTabs(supabase)])
  const site = selectSiteTab(sites, params.site, user.siteId)
  const rows = sortCandidates(candidates.filter((row) => row.siteId === site?.id))

  return (
    <ShipmentHomeScreen
      rows={rows}
      sites={sites}
      site={site}
      counts={countBySite(candidates)}
      notice={shipmentsNoticeText(params.notice, params.no)}
    />
  )
}
