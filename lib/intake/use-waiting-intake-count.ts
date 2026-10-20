'use client'

// サイドメニューの「受付登録」の件数のバッジ（受付待ちの件数）。
// 受付の変更を Realtime で受け取ったら、Server Action の countWaitingIntakes で読み直す（useLiveCount）。

import { countWaitingIntakes } from '@/app/actions/intake-counts'
import type { IntakeRealtimeTable } from './use-intake-changes'
import { useLiveCount } from './use-live-count'

const TABLES: readonly IntakeRealtimeTable[] = ['intakes']

export function useWaitingIntakeCount(initialCount: number | null, enabled: boolean): number | null {
  return useLiveCount(initialCount, enabled, countWaitingIntakes, TABLES)
}
