// 加工場所（営業所）のタブ（本社／A営業所／B営業所。件数つき）。受注登録待ち（S-06a）と CAD（S-05）で共通。
// URL の ?site= で切り替える。リンク先の URL は使う画面が hrefFor で作る（画面ごとに ? の中身が違うため）。
// 見た目は受付待ち一覧のタブ（components/intake/inbox/intake-tabs.tsx）と同じ。

import Link from 'next/link'
import type { SiteTab } from '@/lib/intake/site-tabs'

type SiteTabsProps = {
  sites: readonly SiteTab[]
  current: SiteTab | null
  // 営業所の id → 件数（CAD は作業待ち・作業中の件数。サイドメニューのバッジと同じ数）
  counts: Map<string, number>
  hrefFor: (site: SiteTab) => string
}

export function SiteTabs({ sites, current, counts, hrefFor }: SiteTabsProps) {
  return (
    <nav aria-label="加工場所" className="flex gap-1 border-b border-line px-4">
      {sites.map((site) => {
        const active = site.id === current?.id
        return (
          <Link
            key={site.id}
            href={hrefFor(site)}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm ${
              active ? 'border-navy font-bold text-navy' : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {site.name}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                active ? 'bg-navy text-white' : 'bg-canvas text-neutral-600'
              }`}
            >
              {counts.get(site.id) ?? 0}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
