'use client'

// 通知の状態を、画面のどこからでも使えるようにする仕組み（React Context）。
// 共通レイアウト（app/(main)/layout.tsx）で全体を囲み、
//   ・ヘッダーの通知ベル（未読の数・一覧・既読にする操作）
//   ・右上の新着のお知らせ（NotificationToasts。この Provider が一緒に出す）
// が同じ状態を使う。PR 5 以降は、受付待ち一覧の自動更新などにも使う。

import { createContext, useContext, type ReactNode } from 'react'
import type { Department } from '@/lib/intake/constants'
import {
  useNotificationCenter,
  type NotificationCenter,
} from '@/lib/notifications/use-notification-center'
import type { NotificationItem } from '@/lib/notifications/types'
import { NotificationToasts } from './notification-toasts'

const NotificationsContext = createContext<NotificationCenter | null>(null)

type NotificationsProviderProps = {
  initialUnread: NotificationItem[]
  initialUnreadCount: number
  department: Department | null
  children: ReactNode
}

export function NotificationsProvider({
  initialUnread,
  initialUnreadCount,
  department,
  children,
}: NotificationsProviderProps) {
  const center = useNotificationCenter({ initialUnread, initialUnreadCount, department })

  return (
    <NotificationsContext.Provider value={center}>
      {children}
      <NotificationToasts toasts={center.toasts} onOpen={center.open} onDismiss={center.dismissToast} />
    </NotificationsContext.Provider>
  )
}

// 通知の状態と操作を取り出すフック。NotificationsProvider の外では null になる
export function useNotifications() {
  return useContext(NotificationsContext)
}
