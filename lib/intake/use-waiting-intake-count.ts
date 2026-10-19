'use client'

// サイドメニューの「受付登録」の件数のバッジ（受付待ちの件数）を持つカスタムフック。
//
//   ・最初の件数は共通レイアウト（サーバー）で数えて渡す
//   ・受付の変更を Realtime で受け取ったら、件数を読み直す（Server Action の countWaitingIntakes）
//   ・画面の作り直し（受付登録の後など）でサーバーから新しい件数が届いたら、それに合わせる
// enabled が false（事務・管理者でない）なら、件数は出さない（null）。

import { useCallback, useState } from 'react'
import { countWaitingIntakes } from '@/app/actions/intake-counts'
import { useIntakeChanges } from './use-intake-changes'

export function useWaitingIntakeCount(initialCount: number | null, enabled: boolean): number | null {
  const [count, setCount] = useState(initialCount)

  // サーバーから届いた件数が変わったら、それに合わせる。
  // 「描画中に、前回の値と比べて state を直す」書き方（React の「props が変わったときに state を合わせる」方法）
  const [previousInitial, setPreviousInitial] = useState(initialCount)
  if (previousInitial !== initialCount) {
    setPreviousInitial(initialCount)
    setCount(initialCount)
  }

  const refresh = useCallback(async () => {
    const next = await countWaitingIntakes()
    if (next !== null) setCount(next)
  }, [])
  useIntakeChanges(enabled, () => void refresh())

  return enabled ? count : null
}
