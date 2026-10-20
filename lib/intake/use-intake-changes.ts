'use client'

// 受付（intakes）・加工区分（work_units）の変更を Supabase Realtime で受け取るカスタムフック。
// 受付待ち一覧・CAD の一覧の自動更新（新着の行・対応中の表示・作業中の表示・件数）と、
// サイドメニューの件数のバッジに使う。
//
// 見ているテーブルの行が追加・変更されたら onChange を呼ぶ。
// 対応中の表示のように、短い間に何度も変わることがあるため、最後の変更から delayMs 待ってから 1 回だけ呼ぶ
// （まとめて 1 回にする。間引きのことを debounce と呼ぶ）。
//
// Realtime の配信も RLS に従うため、受付を読めない現場のユーザーには何も届かない。
// enabled が false（事務・管理者でない）なら購読しない。

import { useEffect, useRef } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase-browser'

// Realtime で配信しているテーブル（20261018100500_create_intake_rls_and_realtime.sql で supabase_realtime に追加したもの）
export type IntakeRealtimeTable = 'intakes' | 'work_units'

// tables のテーブルのどれかが変わったら onChange を呼ぶ
export function useTableChanges(
  tables: readonly IntakeRealtimeTable[],
  enabled: boolean,
  onChange: () => void,
  delayMs = 500
) {
  // 購読を作り直さないよう、最新の onChange を ref に入れておく（use-notification-feed.ts と同じ考え方）
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // 配列は描画のたびに別のものになるため、文字にして「中身が変わったときだけ」購読を作り直す
  const tablesKey = tables.join(',')

  useEffect(() => {
    if (!enabled || tablesKey === '') return

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

      // チャンネルの名前は購読ごとに変える（同じ画面で 2 つの部品が購読しても、別のチャンネルになるように）。
      // 1 つのチャンネルに、テーブルごとの購読を .on で重ねる
      let next = supabase.channel(`${tablesKey}:${crypto.randomUUID()}`)
      for (const table of tablesKey.split(',')) {
        next = next.on('postgres_changes', { event: '*', schema: 'public', table }, schedule)
      }
      channel = next.subscribe()
    }

    void subscribe()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (channel) void supabase.removeChannel(channel)
    }
  }, [enabled, delayMs, tablesKey])
}

const INTAKE_TABLES: readonly IntakeRealtimeTable[] = ['intakes']

// 受付（intakes）の変更だけを受け取る（受付待ち一覧・受付登録の件数のバッジ）
export function useIntakeChanges(enabled: boolean, onChange: () => void, delayMs = 500) {
  useTableChanges(INTAKE_TABLES, enabled, onChange, delayMs)
}
