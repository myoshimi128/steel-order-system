// 共通レイアウト（docs/screen-design.md「共通レイアウト」）。
// ログイン画面以外の画面は、すべてこのフォルダ（app/(main)/）の下に置き、ヘッダーとサイドメニューの枠を付ける。
// フォルダ名の ( ) は「ルートグループ」という書き方で、URL には入らない
// （app/(main)/orders/new/page.tsx の URL は /orders/new のまま）。

import { cookies } from 'next/headers'
import { AppHeader } from '@/components/layout/app-header'
import { Sidebar } from '@/components/layout/sidebar'
import { NotificationsProvider } from '@/components/notifications/notifications-provider'
import { getCurrentUser } from '@/lib/auth'
import { countActiveCadUnits } from '@/lib/intake/load-cad-units'
import { countIntakes } from '@/lib/intake/load-intakes'
import { SIDEBAR_COOKIE_NAME, parseSidebarCookie } from '@/lib/layout/sidebar-state'
import { loadUnreadNotifications } from '@/lib/notifications/load-unread'
import { createClient } from '@/lib/supabase-server'

// サイドメニューの件数のバッジ（「受付登録」に受付待ちの件数、「CAD」に作業待ち・作業中の件数）。
// 受付を扱える事務・管理者だけ数える（ほかは null でバッジを出さない）。
// 数えられなかったときもバッジを出さないだけにし、画面は出す
async function loadBadgeCount(
  role: string | undefined,
  count: (supabase: Awaited<ReturnType<typeof createClient>>) => Promise<number>
): Promise<number | null> {
  if (role !== 'office' && role !== 'admin') return null
  try {
    return await count(await createClient())
  } catch (error) {
    console.error(error)
    return null
  }
}

export default async function MainLayout({ children }: LayoutProps<'/'>) {
  // getCurrentUser は cache() で包んでいるため、ルートレイアウトと合わせてもデータの取得は 1 回だけ
  const user = await getCurrentUser()

  // サイドメニューの開閉の好みを cookie から読む。
  // サーバーで読んでおくと、最初の表示から正しい状態で描ける（ちらつかない）
  const cookieStore = await cookies()
  const preferCollapsed = parseSidebarCookie(cookieStore.get(SIDEBAR_COOKIE_NAME)?.value)

  // ヘッダーの通知ベルに最初に出す未読の通知。新着はその後ブラウザで Realtime から受け取る
  // サイドメニューの件数のバッジ（受付待ち・CAD の件数）も一緒に読む
  const [unread, waitingIntakeCount, activeCadCount] = await Promise.all([
    loadUnreadNotifications(user),
    loadBadgeCount(user?.role, (supabase) => countIntakes(supabase, 'waiting')),
    loadBadgeCount(user?.role, countActiveCadUnits),
  ])

  return (
    // 通知の状態（未読の一覧・数・新着のお知らせ）を、ヘッダーの通知ベルなどで使えるようにする
    <NotificationsProvider
      initialUnread={unread.items}
      initialUnreadCount={unread.count}
      department={user?.department ?? null}
    >
      <AppHeader user={user} />
      <div className="flex flex-1">
        <Sidebar
          initialPreferCollapsed={preferCollapsed}
          initialWaitingIntakeCount={waitingIntakeCount}
          initialActiveCadCount={activeCadCount}
        />
        {/* min-w-0 を付けないと、中身が広いときに横にはみ出してしまう（flex の子の最小幅の既定値のため） */}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </NotificationsProvider>
  )
}
