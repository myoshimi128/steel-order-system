// 通知を押したときの移動先（docs/intake/screen-design.md「通知（画面側）」）。
// 受付の新着の通知は、受付待ち一覧でその受付の行を選んだ状態で開く。移動先がない通知は null。

import { intakeListHref } from '@/lib/intake/tabs'
import type { NotificationItem } from './types'

export function notificationHref(item: Pick<NotificationItem, 'kind' | 'intakeId'>): string | null {
  if (item.kind === 'intake_new' && item.intakeId) {
    return intakeListHref({ selected: item.intakeId })
  }
  return null
}
