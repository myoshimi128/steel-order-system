// 受付待ち一覧のタブ（受付待ち・受付登録済・見積・ミルシート・対象外）。
// URL の ?tab= で切り替える。受付待ち・受付登録済には件数を出す。

import Link from 'next/link'
import { INTAKE_TABS, intakeListHref, type IntakeTab } from '@/lib/intake/tabs'

type IntakeTabsProps = {
  current: IntakeTab
  counts: Partial<Record<IntakeTab, number>>
}

export function IntakeTabs({ current, counts }: IntakeTabsProps) {
  return (
    <nav aria-label="受付の区分" className="flex gap-1 border-b border-line px-4">
      {INTAKE_TABS.map(({ tab, label, showCount }) => {
        const active = tab === current
        const count = counts[tab]
        return (
          <Link
            key={tab}
            href={intakeListHref({ tab })}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm ${
              active ? 'border-navy font-bold text-navy' : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            {label}
            {showCount && count !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                  active ? 'bg-navy text-white' : 'bg-canvas text-neutral-600'
                }`}
              >
                {count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
