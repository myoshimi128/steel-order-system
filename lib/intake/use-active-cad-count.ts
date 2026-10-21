'use client'

// サイドメニューの「CAD」の件数のバッジ（作業待ち・作業中のアイトレの件数。ログイン中のユーザーの営業所の分、管理者は全部）。
// 加工区分の変更（振り分け完了で増える・CSV の登録で減る）と、受付の変更（削除など）を Realtime で受け取ったら、
// Server Action の countActiveCad で読み直す（useLiveCount）。

import { countActiveCad } from '@/app/actions/intake-counts'
import type { IntakeRealtimeTable } from './use-intake-changes'
import { useLiveCount } from './use-live-count'

const TABLES: readonly IntakeRealtimeTable[] = ['work_units', 'intakes']

export function useActiveCadCount(initialCount: number | null, enabled: boolean): number | null {
  return useLiveCount(initialCount, enabled, countActiveCad, TABLES)
}
