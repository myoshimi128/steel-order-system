'use client'

// 受注登録待ち（S-06a）の一覧の状態と操作をまとめたカスタムフック。
//
//   ・タブ（営業所）の行（並び順つき）と検索（受付No.・売り先・工事名）
//   ・行を押す → 受注登録の画面（/orders/new?unit=…）を開く。
//     PR 9 で受付と受注をつなぐまでは、画面の上に帯を出すだけで、受付の情報は引き継がない
//   ・この区分の起票を完了（確認のダイアログを出してから、一覧から外す）
//   ・加工区分・受付の変更を Realtime で受け取ったら、一覧を読み直す（振り分け完了・CSV の登録・ほかの人の起票完了）
// 画面の部品（components/order-queue/*）は、このフックの戻り値を表示するだけにする。

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { completeWorkUnit } from '@/app/(main)/orders/queue/actions'
import { WORK_UNIT_KIND_LABELS } from './constants'
import { filterQueueUnits, queueHref, rowsForQueueSite } from './queue'
import type { SiteTab } from './site-tabs'
import type { QueueUnit } from './types'
import { useTableChanges, type IntakeRealtimeTable } from './use-intake-changes'

type Params = {
  units: QueueUnit[]
  site: SiteTab | null
}

const REALTIME_TABLES: readonly IntakeRealtimeTable[] = ['work_units', 'intakes']

export function useOrderQueue({ units, site }: Params) {
  const router = useRouter()

  const [query, setQuery] = useState('')
  const siteRows = rowsForQueueSite(units, site?.id ?? null)
  const visibleRows = filterQueueUnits(siteRows, query)

  // 振り分け完了・CSV の登録・ほかの人の起票完了が届いたら、一覧を読み直す（検索の文字はそのまま残る）
  useTableChanges(REALTIME_TABLES, true, () => router.refresh())

  const [busyUnitId, setBusyUnitId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 行を押した: 受注登録の画面へ
  function open(unit: QueueUnit) {
    router.push(`/orders/new?unit=${unit.id}`)
  }

  // この区分の起票を完了: 起票を終えた区分と、間違って作った区分のどちらにも使う
  async function complete(unit: QueueUnit) {
    const label = `受付No. ${unit.intakeNo ?? ''}（${WORK_UNIT_KIND_LABELS[unit.kind]}）`
    const ok = window.confirm(
      [
        `${label}の起票を完了して、受注登録待ちから外します。`,
        '起票が終わった区分か、間違って作った区分のときに使います。',
        '外した後に必要になったら「受注登録待ちに追加」で入れ直せます。よろしいですか？',
      ].join('\n')
    )
    if (!ok) return
    setBusyUnitId(unit.id)
    setError(null)
    const result = await completeWorkUnit(unit.id)
    setBusyUnitId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    router.replace(queueHref({ site: site?.code, notice: 'completed', no: unit.intakeNo }))
  }

  return {
    query,
    setQuery,
    totalCount: siteRows.length,
    visibleRows,
    busyUnitId,
    error,
    open,
    complete,
  }
}

export type OrderQueue = ReturnType<typeof useOrderQueue>
