'use client'

// サイドメニューの「受注登録」の件数のバッジ（受注登録待ちの件数。ログイン中のユーザーの営業所の分、管理者は全部）。
// 加工区分の変更（振り分け完了・CSV の登録・追加で増える、起票完了で減る）と、受付の変更（削除・加工場所の変更など）を
// Realtime で受け取ったら、Server Action の countReadyQueue で読み直す（useLiveCount）。

import { countReadyQueue } from '@/app/actions/intake-counts'
import type { IntakeRealtimeTable } from './use-intake-changes'
import { useLiveCount } from './use-live-count'

const TABLES: readonly IntakeRealtimeTable[] = ['work_units', 'intakes']

export function useReadyUnitCount(initialCount: number | null, enabled: boolean): number | null {
  return useLiveCount(initialCount, enabled, countReadyQueue, TABLES)
}
