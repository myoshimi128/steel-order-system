'use client'

// 自分の部署の新着の通知を、Supabase Realtime で受け取るカスタムフック
// （docs/intake/screen-design.md「通知（画面側）」）。
//
// Realtime は、DB の変更（ここでは notifications への INSERT）をブラウザへすぐに届ける仕組み。
// 自分の部署の通知だけが届くことは、2 重に守られている:
//   1. 購読の条件 filter: dept=eq.{部署}（ほかの部署の通知を受け取りに行かない）
//   2. notifications の RLS（自分の部署の行だけ参照できる）。Realtime の配信も RLS に従うため、
//      条件を書き換えても、ほかの部署の行は届かない
//
// 画面を閉じた・別のユーザーになったときは、購読を解く（useEffect の後片付け）。

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Department } from '@/lib/intake/constants'
import { createClient } from '@/lib/supabase-browser'
import { toNotificationItem, type NotificationItem, type NotificationRow } from './types'

export function useNotificationFeed(
  department: Department | null,
  onNotify: (item: NotificationItem) => void
) {
  // 受け取ったときの処理は、描画のたびに新しい関数になる。
  // 購読をそのたびに作り直さないよう、最新の関数を ref に入れておき、届いたときに ref から呼ぶ
  const onNotifyRef = useRef(onNotify)
  useEffect(() => {
    onNotifyRef.current = onNotify
  }, [onNotify])

  useEffect(() => {
    // 部署が空のユーザーには通知が届かないため、購読しない
    if (department === null) return

    const supabase = createClient()
    let channel: RealtimeChannel | null = null
    // 購読の準備中に画面を離れたら、購読を始めない
    let cancelled = false

    async function subscribe() {
      // Realtime にログイン中のユーザーの鍵（アクセストークン）を渡す。
      // 渡さないと「ログインしていない人」として扱われ、RLS で 1 行も届かない
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      await supabase.realtime.setAuth(data.session?.access_token ?? null)
      if (cancelled) return

      channel = supabase
        .channel(`notifications:${department}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `dept=eq.${department}`,
          },
          (payload) => {
            onNotifyRef.current(toNotificationItem(payload.new as NotificationRow))
          }
        )
        .subscribe()
    }

    void subscribe()

    return () => {
      cancelled = true
      if (channel) void supabase.removeChannel(channel)
    }
  }, [department])
}
