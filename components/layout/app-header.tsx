// 共通レイアウトのヘッダー（docs/screen-design.md「共通レイアウト」）。
// ネイビーの帯に、ロゴ・システム名・パンくず・通知ベル・ユーザー・ログアウトを並べる。
//
// ユーザーの表示は、設計では「本社シャーリング部 ○○」（営業所・部署と氏名）だが、
// users の部署・営業所の列はまだないため、当面は「氏名（ロール）」を出す。列ができたら設計どおりに切り替える。

import Link from 'next/link'
import { Breadcrumbs } from '@/components/layout/breadcrumbs'
import { Icon } from '@/components/layout/icon'
import { NotificationBell } from '@/components/layout/notification-bell'
import { LogoutButton } from '@/components/logout-button'
import { ROLE_LABEL, type CurrentUser } from '@/lib/current-user'

export function AppHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-20 flex h-[var(--header-height)] shrink-0 items-center gap-6 bg-navy px-6 text-white">
      <Link href="/" className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded bg-white text-navy">
          <Icon name="logo" className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold tracking-wide">鋼材受注システム</span>
      </Link>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-4">
        <NotificationBell />
        {user && (
          <span className="flex items-center gap-2 text-sm">
            {/* 氏名の頭文字の丸印（設計の画面イメージに合わせた飾り） */}
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-semibold"
              aria-hidden="true"
            >
              {user.name.slice(0, 1)}
            </span>
            <span>
              <span className="font-semibold">{user.name}</span>
              <span className="text-white/70">（{ROLE_LABEL[user.role]}）</span>
            </span>
          </span>
        )}
        <LogoutButton className="rounded border border-white/40 px-3 py-1.5 text-sm text-white hover:bg-white/10" />
      </div>
    </header>
  )
}
