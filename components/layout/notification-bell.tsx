'use client'

// ヘッダーの通知ベル（docs/intake/screen-design.md「通知（画面側）」）。
// ・未読の数をベルの右上に出す（0 件なら出さない。10 件以上は「9+」）
// ・押すと未読の一覧（NotificationPanel）を開く。外側を押す・Esc で閉じる
// 未読の一覧と数は NotificationsProvider（Realtime で新着を受け取る）が持っている。

import { useRef, useState } from 'react'
import { Icon } from '@/components/layout/icon'
import { NotificationPanel } from '@/components/notifications/notification-panel'
import { useNotifications } from '@/components/notifications/notifications-provider'
import { useDismissOnOutside } from '@/lib/hooks/use-dismiss-on-outside'
import { formatBadgeCount } from '@/lib/notifications/format'

export function NotificationBell() {
  const center = useNotifications()
  const [open, setOpen] = useState(false)
  // ベルと一覧を囲む要素。この外側を押したら一覧を閉じる
  const containerRef = useRef<HTMLDivElement>(null)
  useDismissOnOutside(containerRef, open, () => setOpen(false))

  const unreadCount = center?.unreadCount ?? 0
  const label = unreadCount > 0 ? `通知（未読 ${unreadCount} 件）` : '通知'

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        // aria-expanded・aria-controls で、一覧が開いているかと、どの一覧を開くかを読み上げに伝える
        aria-expanded={open}
        aria-controls="notification-panel"
        title={label}
        className="relative flex h-9 w-9 items-center justify-center rounded text-white hover:bg-white/10"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-urgent px-1 text-[10px] font-bold leading-none text-white"
            aria-hidden="true"
          >
            {formatBadgeCount(unreadCount)}
          </span>
        )}
        <span className="sr-only">{label}</span>
      </button>

      {open && center && (
        <NotificationPanel
          items={center.unread}
          unreadCount={unreadCount}
          onMarkRead={(item) => void center.markRead(item)}
          onMarkAllRead={() => void center.markAllRead()}
        />
      )}
    </div>
  )
}
