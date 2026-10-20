'use client'

// 新着のお知らせ 1 件（docs/intake/screen-design.md「通知（画面側）」の「右上にトースト（5 秒）」）。
// 5 秒で消える。マウスを乗せている間は消えない（読んでいる途中で消えないように）。× で先に閉じられる。
// お知らせを閉じても、通知は未読のまま（ベルの一覧に残る）。
// 文の部分を押すと、既読にして受付待ち一覧のその行を開く（PR 5）。

import { useState } from 'react'
import { Icon } from '@/components/layout/icon'
import { useAutoDismiss } from '@/lib/hooks/use-auto-dismiss'
import type { NotificationItem } from '@/lib/notifications/types'

// 表示しておく時間（ミリ秒）
const TOAST_DURATION_MS = 5000

type NotificationToastProps = {
  item: NotificationItem
  onOpen: () => void
  onDismiss: () => void
}

export function NotificationToast({ item, onOpen, onDismiss }: NotificationToastProps) {
  const [hovered, setHovered] = useState(false)
  useAutoDismiss(onDismiss, TOAST_DURATION_MS, hovered)

  return (
    <div
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // 枠の外側は押せない（pointer-events-none）ため、お知らせ自体は押せるように戻す
      className="pointer-events-auto flex items-start gap-3 rounded border border-line border-l-4 border-l-navy bg-white px-4 py-3 shadow-lg"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-soft text-navy">
        <Icon name="bell" className="h-4 w-4" />
      </span>
      <button
        type="button"
        onClick={onOpen}
        title="押すと受付待ち一覧で開きます"
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
        {item.body && <p className="mt-0.5 truncate text-xs text-neutral-600">{item.body}</p>}
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="-mr-1 rounded p-1 text-neutral-400 hover:bg-canvas hover:text-neutral-700"
      >
        <Icon name="x" className="h-4 w-4" />
        <span className="sr-only">閉じる</span>
      </button>
    </div>
  )
}
