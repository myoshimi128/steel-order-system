// CAD の一覧の状態のタブ（作業待ち・作業中 / CSV 登録済。開いている加工場所の件数つき）。
// URL の ?tab= で切り替える（加工場所の ?site= はそのまま残す）。加工場所のタブ（SiteTabs）の下に、少し小さく出す。

import Link from 'next/link'
import { CAD_TABS, cadHref, type CadTab } from '@/lib/intake/cad'

type CadTabsProps = {
  // 開いている加工場所のタブの営業所のコード
  site: string | null
  current: CadTab
  counts: Record<CadTab, number>
}

export function CadTabs({ site, current, counts }: CadTabsProps) {
  return (
    <nav aria-label="CAD の作業の状態" className="flex gap-1 border-b border-line bg-canvas/50 px-4">
      {CAD_TABS.map(({ tab, label }) => {
        const active = tab === current
        return (
          <Link
            key={tab}
            href={cadHref({ site, tab })}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-xs ${
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
