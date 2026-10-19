'use client'

// 通知の状態（未読の一覧・数・新着のお知らせ）と操作（既読にする・お知らせを閉じる）をまとめたカスタムフック。
// NotificationsProvider（components/notifications/notifications-provider.tsx）が 1 回だけ使い、
// ベル・新着のお知らせには Context で渡す。

import { useCallback, useReducer } from 'react'
import { markAllNotificationsRead, markNotificationRead } from '@/app/actions/notifications'
import type { Department } from '@/lib/intake/constants'
import { notificationCenterReducer } from './center-reducer'
import type { NotificationItem } from './types'
import { useNotificationFeed } from './use-notification-feed'

type Params = {
  // 共通レイアウト（サーバー側）で読んだ、最初の未読の一覧と数
  initialUnread: NotificationItem[]
  initialUnreadCount: number
  department: Department | null
}

export function useNotificationCenter({ initialUnread, initialUnreadCount, department }: Params) {
  const [state, dispatch] = useReducer(notificationCenterReducer, {
    unread: initialUnread,
    unreadCount: initialUnreadCount,
    toasts: [],
  })

  // Realtime で新着が届いたら、一覧・数・お知らせに足す
  const handleNotify = useCallback((item: NotificationItem) => {
    dispatch({ type: 'received', item })
  }, [])
  useNotificationFeed(department, handleNotify)

  // 1 件を既読にする。
  // 画面は先に既読の見た目にし（待たせないため）、保存に失敗したら未読に戻す
  const markRead = useCallback(
    async (item: NotificationItem) => {
      dispatch({ type: 'markedRead', id: item.id })
      const result = await markNotificationRead(item.id)
      if (result?.error) {
        console.error(result.error)
        dispatch({ type: 'unmarked', item })
      }
    },
    []
  )

  // すべて既読にする。失敗したときは、開き直すと未読が戻る（ここでは戻さない）
  const markAllRead = useCallback(async () => {
    dispatch({ type: 'markedAllRead' })
    const result = await markAllNotificationsRead()
    if (result?.error) console.error(result.error)
  }, [])

  const dismissToast = useCallback((id: string) => {
    dispatch({ type: 'toastDismissed', id })
  }, [])

  return { ...state, markRead, markAllRead, dismissToast }
}

export type NotificationCenter = ReturnType<typeof useNotificationCenter>
