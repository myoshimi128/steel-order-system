// CAD の一覧のタブ（作業待ち・作業中 / CSV 登録済。件数つき）。
// URL の ?tab= で切り替える（受付待ち一覧のタブ components/intake/inbox/intake-tabs.tsx と同じ見た目）。

import Link from 'next/link'
import { CAD_TABS, cadHref, type CadTab } from '@/lib/intake/cad'

type CadTabsProps = {
  current: CadTab
  counts: Record<CadTab, number>
}

export function CadTabs({ current, counts }: CadTabsProps) {
  return (
    <nav aria-label="CAD の区分" className="flex gap-1 border-b border-line px-4">
      {CAD_TABS.map(({ tab, label }) => {
        const active = tab === current
        return (
          <Link
            key={tab}
            href={cadHref({ tab })}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm ${
              active ? 'border-navy font-bold text-navy' : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {label}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                active ? 'bg-navy text-white' : 'bg-canvas text-neutral-600'
              }`}
            >
              {counts[tab]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
