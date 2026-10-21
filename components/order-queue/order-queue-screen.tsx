'use client'

// 受注登録待ち一覧（S-06a。docs/intake/screen-design.md「S-06a 受注登録待ち一覧」、画面イメージ 06a）。
//   ・上: 説明・見出し・「＋ 受注登録待ちに追加」・3 段階の進み具合（①受注登録待ち → ②受注情報 → ③注文内容）
//   ・中: 加工場所のタブ（件数つき）と一覧
//   ・下: 一覧に並ぶ仕組みの案内
// 「受注登録待ちに追加」（S-06b）はこの画面の上に重ねるモーダル（AddWorkUnitDialog）。
// 状態と操作は useOrderQueue（lib/intake/use-order-queue.ts）が持つ。

import Link from 'next/link'
import { useState } from 'react'
import { SiteTabs } from '@/components/intake/site-tabs'
import { Icon } from '@/components/layout/icon'
import { StepIndicator } from '@/components/order-entry/step-indicator'
import { queueHref } from '@/lib/intake/queue'
import { orderEditHref } from '@/lib/order-entry/order-no'
import { countBySite, type SiteTab } from '@/lib/intake/site-tabs'
import type { QueueUnit } from '@/lib/intake/types'
import { useOrderQueue } from '@/lib/intake/use-order-queue'
import { AddWorkUnitDialog } from './add-work-unit-dialog'
import { QueueList } from './queue-list'

type OrderQueueScreenProps = {
  units: QueueUnit[]
  sites: SiteTab[]
  // 開いているタブの営業所
  site: SiteTab | null
  // 追加・起票完了の結果のお知らせ（なければ null）
  notice: string | null
}

export function OrderQueueScreen({ units, sites, site, notice }: OrderQueueScreenProps) {
  const queue = useOrderQueue({ units, site })
  const [addOpen, setAddOpen] = useState(false)

  return (
    <main className="flex flex-1 flex-col bg-canvas px-5 py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">振り分けが終わった注文から選んで、受注登録します</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">受注登録</h1>
        </div>
        <div className="flex items-center gap-3">
          {/* 処理区分 1 変更・2 削除の入口（登録済みの受注を受注No. で呼び出す） */}
          <Link
            href={orderEditHref({ type: 'edit' })}
            className="rounded border border-line bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas"
          >
            受注No. で呼び出す（変更・削除）
          </Link>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded border border-line bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas"
          >
            <Icon name="plus" className="h-4 w-4" />
            受注登録待ちに追加
          </button>
          <div className="ml-3">
            <StepIndicator current="queue" withQueue />
          </div>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-3 rounded border border-navy/20 bg-navy-soft px-4 py-2.5 text-sm font-semibold text-navy">
          {notice}
        </p>
      )}
      {queue.error && (
        <p role="alert" className="mt-3 rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent">
          {queue.error}
        </p>
      )}

      {/* 一覧は画面の高さに合わせ、表の中でスクロールする */}
      <section className="mt-4 flex h-[calc(100dvh-var(--header-height)-140px)] min-h-[560px] flex-col rounded border border-line bg-white">
        <SiteTabs
          sites={sites}
          current={site}
          counts={countBySite(units)}
          hrefFor={(tab) => queueHref({ site: tab.code })}
        />
        <QueueList queue={queue} />
        <div className="border-t border-line px-4 py-3 text-xs text-neutral-500">
          <p>先寸は振り分け完了ですぐに、アイトレは CAD で CSV が登録されるとここに並びます。</p>
          <p>「見落とし追加」「口頭」「その他」は、人が「受注登録待ちに追加」で入れたものです。</p>
        </div>
      </section>

      {addOpen && <AddWorkUnitDialog siteCode={site?.code ?? null} onClose={() => setAddOpen(false)} />}
    </main>
  )
}
