// 受注登録の画面の見出しの横に出す帯（受注登録待ちの一覧の行から開いたとき）。
// 「受付No. 26-1003 [先寸] A製作所 から受注登録」と「← 受注登録待ちに戻る」を出す。
//
// 受付と受注をつなぐのは PR 9（docs/intake/basic-design.md「実装の順序」）。それまでは帯を出すだけで、
// 受付の情報を受注情報の初期値に入れず、登録した受注も受付・加工区分につながらない（テストのデータとして扱い、PR 9 で消す）。

import Link from 'next/link'
import { Icon } from '@/components/layout/icon'
import { WORK_UNIT_KIND_LABELS } from '@/lib/intake/constants'
import { queueHref } from '@/lib/intake/queue'
import type { QueueUnit } from '@/lib/intake/types'

type QueueSourceBannerProps = {
  unit: QueueUnit
  // 戻る先のタブ（加工場所のコード）
  siteCode: string | null
  // 一覧から外れている（起票完了済みなど）ときは、その旨を出す
  inQueue: boolean
}

export function QueueSourceBanner({ unit, siteCode, inQueue }: QueueSourceBannerProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded border border-navy/20 bg-navy-soft px-3 py-1.5 text-sm">
      <Link
        href={queueHref({ site: siteCode })}
        className="flex shrink-0 items-center gap-1 text-xs text-navy hover:underline"
      >
        <Icon name="arrow-left" className="h-3.5 w-3.5" />
        受注登録待ちに戻る
      </Link>
      <span className="shrink-0 font-semibold tabular-nums text-navy">受付No. {unit.intakeNo}</span>
      <span
        className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ${
          unit.kind === 'aitore' ? 'bg-navy text-white' : 'border border-navy bg-white text-navy'
        }`}
      >
        {WORK_UNIT_KIND_LABELS[unit.kind]}
      </span>
      <span className="min-w-0 truncate text-neutral-700">{unit.customerName}</span>
      <span className="shrink-0 text-xs text-neutral-500">
        {inQueue ? 'から受注登録（受付の情報の引き継ぎは今後）' : 'この区分は受注登録待ちから外れています'}
      </span>
    </div>
  )
}
