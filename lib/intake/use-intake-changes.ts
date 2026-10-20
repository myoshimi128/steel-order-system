'use client'

// 受付（intakes）の変更を Supabase Realtime で受け取るカスタムフック。
// 受付待ち一覧の自動更新（新着の行・対応中の表示・件数）と、サイドメニューの件数のバッジに使う。
//
// 受付の行が追加・変更されたら onChange を呼ぶ。
// 対応中の表示のように、短い間に何度も変わることがあるため、最後の変更から delayMs 待ってから 1 回だけ呼ぶ
// （まとめて 1 回にする。間引きのことを debounce と呼ぶ）。
//
// Realtime の配信も RLS に従うため、受付を読めない現場のユーザーには何も届かない。
// enabled が false（事務・管理者でない）なら購読しない。

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'

export function useIntakeChanges(enabled: boolean, onChange: () => void, delayMs = 500) {
  // 購読を作り直さないよう、最新の onChange を ref に入れておく（use-notification-feed.ts と同じ考え方）
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    // 変更が届くたびに待ち時間をやり直し、静かになってから 1 回だけ呼ぶ
    function schedule() {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => onChangeRef.current(), delayMs)
    }

    async function subscribe() {
      // Realtime にログイン中のユーザーの鍵を渡す（渡さないと RLS で 1 行も届かない）
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      await supabase.realtime.setAuth(data.session?.access_token ?? null)
      if (cancelled) return

      // チャンネルの名前は購読ごとに変える（同じ画面で 2 つの部品が購読しても、別のチャンネルになるように）
      channel = supabase
        .channel(`intakes:${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'intakes' }, schedule)
        .subscribe()
    }

    void subscribe()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [enabled, delayMs])
}
