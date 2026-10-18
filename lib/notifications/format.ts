// 通知の表示に使う書式と、一覧の更新（純粋な関数にしてテストする）。

import { formatShortDateTime } from '@/lib/lead-time/display'
import type { NotificationItem } from './types'

// ベルの右上に出す未読の数。10 件以上は「9+」にする（丸の中に収まるように）
export function formatBadgeCount(count: number): string {
  return count > 9 ? '9+' : String(count)
}

// 通知の日時を「たった今」「3分前」「2時間前」、1 日以上前は「10/16 08:15」の形にする
export function formatRelativeTime(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  return formatShortDateTime(iso)
}

// 新しく届いた通知を一覧の先頭に足す。
// Realtime は同じ通知を 2 回届けることがあるため、同じ id がすでにあれば足さない。
// 一覧は limit 件までにする（古いものから外す）
export function prependNotification(
  list: NotificationItem[],
  item: NotificationItem,
  limit: number
): { list: NotificationItem[]; added: boolean } {
  if (list.some((n) => n.id === item.id)) {
    return { list, added: false }
  }
  return { list: [item, ...list].slice(0, limit), added: true }
}
