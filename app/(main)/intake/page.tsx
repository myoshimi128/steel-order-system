// 受付待ち一覧（S-04a）。サイドメニューの「受付登録」から開く。
// URL の ?tab= でタブ（受付待ち・受付登録済・見積・ミルシート・対象外）、?selected= で選んだ行
// （通知から開いたとき）、?notice= と ?no= で受付登録などの結果のお知らせを受け取る。
// 画面の中身は IntakeInboxScreen（components/intake/inbox/intake-inbox.tsx）。

import { IntakeInboxScreen } from '@/components/intake/inbox/intake-inbox'
import { getCurrentUser } from '@/lib/auth'
import { countIntakes, loadIntakeList, loadUnreadIntakeIds } from '@/lib/intake/load-intakes'
import { nowTimeInJapan } from '@/lib/intake/received-at'
import { intakeNoticeText, parseIntakeTab } from '@/lib/intake/tabs'
import { todayInJapan } from '@/lib/order-entry/date'
import { createClient } from '@/lib/supabase-server'

type IntakePageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function IntakePage({ searchParams }: IntakePageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  // 受付を扱えるのは事務・管理者だけ（RLS でも強制している）
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600">この画面を開く権限がありません。</p>
      </main>
    )
  }

  const tab = parseIntakeTab(params.tab)
  const supabase = await createClient()
  const [rows, waitingCount, registeredCount, unreadIntakeIds] = await Promise.all([
    loadIntakeList(supabase, tab),
    countIntakes(supabase, 'waiting'),
    countIntakes(supabase, 'registered'),
    loadUnreadIntakeIds(supabase),
  ])

  const selected = typeof params.selected === 'string' ? params.selected : null

  return (
    <IntakeInboxScreen
      tab={tab}
      rows={rows}
      counts={{ waiting: waitingCount, registered: registeredCount }}
      initialSelectedId={selected}
      unreadIntakeIds={unreadIntakeIds}
      userId={user.id}
      notice={intakeNoticeText(params.notice, params.no)}
      today={todayInJapan()}
      nowTime={nowTimeInJapan(new Date())}
    />
  )
}
