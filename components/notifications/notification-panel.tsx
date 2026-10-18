'use client'

// 通知ベルを押したときに開く、未読の通知の一覧。
// 1 件を押すとその通知を既読にする。「すべて既読にする」でまとめて既読にする。
// 押したときの移動先（受付待ち一覧）は、その画面を作る PR 5 で足す。

import { useState } from 'react'
import { formatRelativeTime } from '@/lib/notifications/format'
import type { NotificationItem } from '@/lib/notifications/types'

type NotificationPanelProps = {
  items: NotificationItem[]
  // 未読の総数（一覧に入りきらない分も含む）
  unreadCount: number
  onMarkRead: (item: NotificationItem) => void
  onMarkAllRead: () => void
}

export function NotificationPanel({
  items,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
}: NotificationPanelProps) {
  // 「3分前」などの基準にする時刻。一覧を開いた時点の時刻で固定する
  // （描画のたびに時刻を読むと、同じ内容でも表示が変わってしまうため）
  const [now] = useState(() => new Date())
  // 一覧に入りきらない未読の数
  const hiddenCount = unreadCount - items.length

  return (
    <div
      id="notification-panel"
      className="absolute right-0 top-full z-30 mt-2 w-[360px] overflow-hidden rounded border border-line bg-white text-neutral-900 shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <p className="text-sm font-semibold">
          通知
          <span className="ml-2 text-xs font-normal text-neutral-500">未読 {unreadCount} 件</span>
        </p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="rounded px-2 py-1 text-xs text-navy hover:bg-navy-soft"
          >
            すべて既読にする
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">未読の通知はありません</p>
      ) : (
        <ul className="max-h-[420px] overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onMarkRead(item)}
                title="押すと既読にします"
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas"
              >
                {/* 未読の印 */}
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-navy" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{item.title}</span>
                  {item.body && (
                    <span className="mt-0.5 block truncate text-xs text-neutral-600">{item.body}</span>
                  )}
                  <span className="mt-1 block text-xs text-neutral-400">
                    {formatRelativeTime(item.createdAt, now)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hiddenCount > 0 && (
        <p className="border-t border-line px-4 py-2 text-center text-xs text-neutral-500">
          ほか {hiddenCount} 件の未読があります
        </p>
      )}
    </div>
  )
}
