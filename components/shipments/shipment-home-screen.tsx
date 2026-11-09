// 送り状発行の入口（/shipments。docs/screen-design.md「送り状発行」の「入口」）。
//   ・上: 説明・見出し、取り消しの結果のお知らせ
//   ・中: 番号で呼び出す欄（受注No. で送り状を作る / 送り状No. で発行済みの送り状を開く）
//   ・下: 加工場所のタブと、送り状を作れる受注の一覧（完了していない受注。最短出荷 → 納期の早い順 → 後報）

import { SiteTabs } from '@/components/intake/site-tabs'
import type { ShipmentCandidate } from '@/lib/shipments/candidates'
import { shipmentsHref } from '@/lib/shipments/shipment-no'
import type { SiteTab } from '@/lib/intake/site-tabs'
import { ShipmentCandidateList } from './shipment-candidate-list'
import { ShipmentLookupForm } from './shipment-lookup-form'

type ShipmentHomeScreenProps = {
  // 開いているタブの加工場所の受注（並べ替え済み）
  rows: ShipmentCandidate[]
  sites: SiteTab[]
  site: SiteTab | null
  // 営業所の id → 件数（タブの件数）
  counts: Map<string, number>
  notice: string | null
}

export function ShipmentHomeScreen({ rows, sites, site, counts, notice }: ShipmentHomeScreenProps) {
  return (
    <main className="flex flex-1 flex-col gap-4 bg-canvas px-5 py-5">
      <div>
        <p className="text-sm text-neutral-500">納期が決まった受注の送り状を作り、4 部（積み込み用・運転手用・受領書・送り状）を印刷します</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">送り状発行</h1>
      </div>

      {notice && (
        <p role="status" className="rounded border border-navy/20 bg-navy-soft px-4 py-2.5 text-sm font-semibold text-navy">
          {notice}
        </p>
      )}

      <ShipmentLookupForm />

      {/* 一覧は画面の高さに合わせ、表の中でスクロールする */}
      <section className="flex h-[calc(100dvh-var(--header-height)-260px)] min-h-[480px] flex-col rounded border border-line bg-white">
        <SiteTabs sites={sites} current={site} counts={counts} hrefFor={(tab) => shipmentsHref({ site: tab.code })} />
        <ShipmentCandidateList rows={rows} />
      </section>
    </main>
  )
}
