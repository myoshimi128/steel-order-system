// 共通レイアウト（docs/screen-design.md「共通レイアウト」）。
// ログイン画面以外の画面は、すべてこのフォルダ（app/(main)/）の下に置き、ヘッダーとサイドメニューの枠を付ける。
// フォルダ名の ( ) は「ルートグループ」という書き方で、URL には入らない
// （app/(main)/orders/new/page.tsx の URL は /orders/new のまま）。

import { cookies } from 'next/headers'
import { AppHeader } from '@/components/layout/app-header'
import { Sidebar } from '@/components/layout/sidebar'
import { getCurrentUser } from '@/lib/auth'
import { SIDEBAR_COOKIE_NAME, parseSidebarCookie } from '@/lib/layout/sidebar-state'

export default async function MainLayout({ children }: LayoutProps<'/'>) {
  // getCurrentUser は cache() で包んでいるため、ルートレイアウトと合わせてもデータの取得は 1 回だけ
  const user = await getCurrentUser()

  // サイドメニューの開閉の好みを cookie から読む。
  // サーバーで読んでおくと、最初の表示から正しい状態で描ける（ちらつかない）
  const cookieStore = await cookies()
  const preferCollapsed = parseSidebarCookie(cookieStore.get(SIDEBAR_COOKIE_NAME)?.value)

  return (
    <>
      <AppHeader user={user} />
      <div className="flex flex-1">
        <Sidebar initialPreferCollapsed={preferCollapsed} />
        {/* min-w-0 を付けないと、中身が広いときに横にはみ出してしまう（flex の子の最小幅の既定値のため） */}
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </>
  )
}
