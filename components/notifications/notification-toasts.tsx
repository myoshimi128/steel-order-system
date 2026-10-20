'use client'

// 新着のお知らせを画面の右上（ヘッダーのすぐ下）に縦に並べる枠。
// 1 件ずつの見た目と、5 秒で消える動きは NotificationToast に任せる。

import type { NotificationItem } from '@/lib/notifications/types'
import { NotificationToast } from './notification-toast'

type NotificationToastsProps = {
  toasts: NotificationItem[]
  // お知らせを押した（既読にして、受付待ち一覧のその行を開く）
  onOpen: (item: NotificationItem) => void
  onDismiss: (id: string) => void
}

export function NotificationToasts({ toasts, onOpen, onDismiss }: NotificationToastsProps) {
  return (
    // aria-live="polite" で、新しく出たお知らせを読み上げソフトにも伝える（読み上げ中の内容は遮らない）
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-6 top-[calc(var(--header-height)+12px)] z-40 flex w-[340px] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          item={toast}
          onOpen={() => onOpen(toast)}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  )
}
