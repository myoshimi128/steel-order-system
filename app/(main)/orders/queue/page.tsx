// 受注登録待ち一覧（S-06a）。サイドメニューの「受注登録」から開く（起票待ちのカゴ）。
// URL の ?site= で加工場所のタブ（営業所のコード）、?notice= と ?no= で追加・起票完了の結果のお知らせを受け取る。
// 画面の中身は OrderQueueScreen（components/order-queue/order-queue-screen.tsx）。

import { OrderQueueScreen } from '@/components/order-queue/order-queue-screen'
import { getCurrentUser } from '@/lib/auth'
import { loadQueueSites, loadQueueUnits } from '@/lib/intake/load-queue-units'
import { queueNoticeText, selectQueueSite } from '@/lib/intake/queue'
import { createClient } from '@/lib/supabase-server'

type QueuePageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function OrderQueuePage({ searchParams }: QueuePageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  // 受注を起票できるのは事務・管理者だけ（RLS でも加工区分を読めない）
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600">この画面を開く権限がありません。</p>
      </main>
    )
  }

  const supabase = await createClient()
  const [units, sites] = await Promise.all([loadQueueUnits(supabase), loadQueueSites(supabase)])
  const site = selectQueueSite(sites, params.site, user.siteId)

  return (
    <OrderQueueScreen
      units={units}
      sites={sites}
      site={site}
      notice={queueNoticeText(params.notice, params.no)}
    />
  )
}
