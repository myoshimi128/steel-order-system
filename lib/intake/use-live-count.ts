'use client'

// サイドメニューの件数のバッジを持つカスタムフック（受付待ちの件数・CAD の件数で共通）。
//
//   ・最初の件数は共通レイアウト（サーバー）で数えて渡す
//   ・tables のテーブルの変更を Realtime で受け取ったら、load（Server Action）で件数を読み直す
//   ・画面の作り直し（受付登録の後など）でサーバーから新しい件数が届いたら、それに合わせる
// enabled が false（事務・管理者でない）なら、件数は出さない（null）。

import { useCallback, useState } from 'react'
import { useTableChanges, type IntakeRealtimeTable } from './use-intake-changes'

export function useLiveCount(
  initialCount: number | null,
  enabled: boolean,
  load: () => Promise<number | null>,
  tables: readonly IntakeRealtimeTable[]
): number | null {
  const [count, setCount] = useState(initialCount)

  // サーバーから届いた件数が変わったら、それに合わせる。
  // 「描画中に、前回の値と比べて state を直す」書き方（React の「props が変わったときに state を合わせる」方法）
  const [previousInitial, setPreviousInitial] = useState(initialCount)
  if (previousInitial !== initialCount) {
    setPreviousInitial(initialCount)
    setCount(initialCount)
  }

  const refresh = useCallback(async () => {
    const next = await load()
    if (next !== null) setCount(next)
  }, [load])
  useTableChanges(tables, enabled, () => void refresh())

  return enabled ? count : null
}
