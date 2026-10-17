// ヘッダーの通知ベル。
// 通知のテーブル（notifications。docs/intake/table-design.md）ができるまでは、アイコンだけを出して押せない状態にする。
// テーブルができたら、未読の件数の印と、未読の一覧を開く操作を追加する（docs/intake/screen-design.md「通知（画面側）」）

import { Icon } from '@/components/layout/icon'

export function NotificationBell() {
  return (
    <span
      className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded text-white/60"
      title="通知（準備中）"
      aria-disabled="true"
    >
      <Icon name="bell" className="h-5 w-5" />
      <span className="sr-only">通知（準備中）</span>
    </span>
  )
}
