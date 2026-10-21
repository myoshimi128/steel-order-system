// 受注登録待ちの加工場所のタブ（本社／A営業所／B営業所。件数つき）。
// URL の ?site= で切り替える（受付待ち一覧のタブ components/intake/inbox/intake-tabs.tsx と同じ見た目）。

import Link from 'next/link'
import { queueHref, type QueueSite } from '@/lib/intake/queue'

type QueueSiteTabsProps = {
  sites: readonly QueueSite[]
  current: QueueSite | null
  // 営業所の id → 件数
  counts: Map<string, number>
}

export function QueueSiteTabs({ sites, current, counts }: QueueSiteTabsProps) {
  return (
    <nav aria-label="加工場所" className="flex gap-1 border-b border-line px-4">
      {sites.map((site) => {
        const active = site.id === current?.id
        return (
          <Link
            key={site.id}
            href={queueHref({ site: site.code })}
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
