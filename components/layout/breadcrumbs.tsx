'use client'

// ヘッダーのパンくず（「› シャーリング部 › 受注登録」）。
// 今の URL から lib/layout/menus.ts の buildBreadcrumbs() で作る。URL を読むためクライアントコンポーネントにする

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { buildBreadcrumbs } from '@/lib/layout/menus'

export function Breadcrumbs() {
  const crumbs = buildBreadcrumbs(usePathname())

  if (crumbs.length === 0) return null

  return (
    <nav aria-label="現在の場所">
      <ol className="flex items-center gap-2 text-sm text-white/70">
        {crumbs.map((crumb) => (
          <li key={crumb.label} className="flex items-center gap-2">
            <span aria-hidden="true">›</span>
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-white">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-white">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
