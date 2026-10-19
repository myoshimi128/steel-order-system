// 通知の状態（未読の一覧・未読の数・右上に出している新着のお知らせ）の更新。
// React の useReducer で使う。「今の状態」と「起きたこと（action）」から次の状態を作る純粋な関数にして、テストする。

import { prependNotification } from './format'
import { UNREAD_LIST_LIMIT, type NotificationItem } from './types'

// 右上に同時に出す新着のお知らせの数の上限（それより古いものから消す）
export const MAX_TOASTS = 3

export type NotificationCenterState = {
  // 未読の通知（新しい順。最大 UNREAD_LIST_LIMIT 件）
  unread: NotificationItem[]
  // 未読の総数（一覧に入りきらない分も含む）
  unreadCount: number
  // 右上に出している新着のお知らせ（古い順。下に新しいものを足す）
  toasts: NotificationItem[]
}

export type NotificationCenterAction =
  // Realtime で新着が届いた
  | { type: 'received'; item: NotificationItem }
  // 1 件を既読にした
  | { type: 'markedRead'; id: string }
  // 既読にできなかったので、未読に戻す
  | { type: 'unmarked'; item: NotificationItem }
  // すべて既読にした
  | { type: 'markedAllRead' }
  // 新着のお知らせを閉じた（5 秒たった・× を押した）
  | { type: 'toastDismissed'; id: string }

export function notificationCenterReducer(
  state: NotificationCenterState,
  action: NotificationCenterAction
): NotificationCenterState {
  switch (action.type) {
    case 'received': {
      const { list, added } = prependNotification(state.unread, action.item, UNREAD_LIST_LIMIT)
      // 同じ通知が 2 回届いたときは、数もお知らせも増やさない
      if (!added) return state
      return {
        unread: list,
        unreadCount: state.unreadCount + 1,
        toasts: [...state.toasts, action.item].slice(-MAX_TOASTS),
      }
    }
    case 'markedRead': {
      if (!state.unread.some((n) => n.id === action.id)) return state
      return {
        unread: state.unread.filter((n) => n.id !== action.id),
        unreadCount: Math.max(0, state.unreadCount - 1),
        toasts: state.toasts.filter((n) => n.id !== action.id),
      }
    }
    case 'unmarked': {
      if (state.unread.some((n) => n.id === action.item.id)) return state
      // 新しい順を保つよう、作られた日時で並べ直す（ISO の文字列は、そのまま大小を比べられる）
      const unread = [...state.unread, action.item]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
        .slice(0, UNREAD_LIST_LIMIT)
      return { ...state, unread, unreadCount: state.unreadCount + 1 }
    }
    case 'markedAllRead':
      return { unread: [], unreadCount: 0, toasts: [] }
    case 'toastDismissed':
      return { ...state, toasts: state.toasts.filter((n) => n.id !== action.id) }
  }
}
