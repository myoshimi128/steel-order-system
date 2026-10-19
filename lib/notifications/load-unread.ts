// 共通レイアウト（app/(main)/layout.tsx）で、最初に表示する未読の通知を読む。
// 新着はその後ブラウザで Realtime から受け取る（use-notification-feed.ts）。

import { createClient } from '@/lib/supabase-server'
import type { CurrentUser } from '@/lib/current-user'
import { fetchUnreadNotifications } from './queries'
import { UNREAD_LIST_LIMIT, type NotificationItem } from './types'

export async function loadUnreadNotifications(
  user: CurrentUser | null
): Promise<{ items: NotificationItem[]; count: number }> {
  // 部署が空のユーザーには通知が届かない（RLS でも 1 行も見えない）ため、読みに行かない
  if (!user || user.department === null) {
    return { items: [], count: 0 }
  }
  const supabase = await createClient()
  try {
    return await fetchUnreadNotifications(supabase, UNREAD_LIST_LIMIT)
  } catch (error) {
    // 通知が読めなくても、画面そのものは使えるようにする（ベルが 0 件になるだけ）
    console.error(error)
    return { items: [], count: 0 }
  }
}
