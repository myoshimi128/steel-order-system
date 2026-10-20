'use client'

// 受付待ち一覧（S-04a。docs/intake/screen-design.md「S-04a 受付待ち一覧」、画面イメージ 04a）。
//   ・上: 説明・見出し・「受付No. で呼び出す（変更・削除）」「＋ 手動で受付を追加」
//   ・左: タブ（受付待ち・受付登録済・見積・ミルシート・対象外）と一覧
//   ・右: 選んだ行の中身（メールの本文・添付）と操作
// 状態と操作は useIntakeInbox（lib/intake/use-intake-inbox.ts）が持つ。

import Link from 'next/link'
import { useState } from 'react'
import { Icon } from '@/components/layout/icon'
import { ManualIntakeDialog } from '@/components/intake/manual/manual-intake-dialog'
import type { IntakeTab } from '@/lib/intake/tabs'
import type { IntakeListRow } from '@/lib/intake/types'
import { useIntakeInbox } from '@/lib/intake/use-intake-inbox'
import { IntakeList } from './intake-list'
import { IntakePreview } from './intake-preview'
import { IntakeTabs } from './intake-tabs'

type IntakeInboxScreenProps = {
  tab: IntakeTab
  rows: IntakeListRow[]
  counts: Partial<Record<IntakeTab, number>>
  initialSelectedId: string | null
  unreadIntakeIds: string[]
  userId: string
  // 受付登録・変更・削除のあとに出すお知らせ（なければ null）
  notice: string | null
  // 手動で受付を追加の受付日時の初期値（日本時間の今日・今の時刻。サーバーで求める）
  today: string
  nowTime: string
}

export function IntakeInboxScreen(props: IntakeInboxScreenProps) {
  const inbox = useIntakeInbox(props)
  const [manualOpen, setManualOpen] = useState(false)

  return (
    <main className="flex flex-1 flex-col bg-canvas px-5 py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">
            届いたメール・FAX は、ここに並びます。1 件ずつ確認して受付登録します
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">受付登録</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/intake/register?type=1"
            className="rounded border border-line bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas"
          >
            受付No. で呼び出す（変更・削除）
          </Link>
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="flex items-center gap-2 rounded border border-line bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas"
          >
            <Icon name="plus" className="h-4 w-4" />
            手動で受付を追加
          </button>
        </div>
      </div>

      {props.notice && (
        <p role="status" className="mt-3 rounded border border-navy/20 bg-navy-soft px-4 py-2.5 text-sm font-semibold text-navy">
          {props.notice}
        </p>
      )}

      {/* 左の一覧と右の中身。画面の高さに合わせ、それぞれの中でスクロールする */}
      <div className="mt-4 grid h-[calc(100dvh-var(--header-height)-140px)] min-h-[560px] grid-cols-[minmax(0,1fr)_400px] gap-4">
        <section className="flex min-h-0 flex-col rounded border border-line bg-white">
          <IntakeTabs current={props.tab} counts={props.counts} />
          <IntakeList tab={props.tab} inbox={inbox} totalCount={props.rows.length} />
        </section>
        <section className="flex min-h-0 flex-col rounded border border-line bg-white">
          <IntakePreview inbox={inbox} />
        </section>
      </div>

      {manualOpen && (
        <ManualIntakeDialog today={props.today} nowTime={props.nowTime} onClose={() => setManualOpen(false)} />
      )}
    </main>
  )
}
