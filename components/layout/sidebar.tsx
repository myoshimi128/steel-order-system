'use client'

// サイドメニュー（docs/screen-design.md「共通レイアウト」）。
// ・URL に応じて、ホームのメニューかシャーリング部のメニューを出す（lib/layout/menus.ts）
// ・開閉できる。閉じるとアイコンだけの幅になる。開閉の状態は useSidebar が持ち、cookie に保存する
// ・項目に件数のバッジを出す（受付登録の項目に受付待ちの件数、CAD の項目に作業待ち・作業中の件数。
//   受付・加工区分の変更を Realtime で受け取って更新する）

import Link from 'next/link'
import { Icon } from '@/components/layout/icon'
import { SidebarItem } from '@/components/layout/sidebar-item'
import { useActiveCadCount } from '@/lib/intake/use-active-cad-count'
import { useWaitingIntakeCount } from '@/lib/intake/use-waiting-intake-count'
import { isMenuItemActive, selectMenu, type MenuBadgeCounts } from '@/lib/layout/menus'
import { useSidebar } from '@/lib/layout/use-sidebar'

type SidebarProps = {
  initialPreferCollapsed: boolean
  // 受付待ちの件数（共通レイアウトで数えたもの）。事務・管理者でなければ null（バッジを出さない）
  initialWaitingIntakeCount: number | null
  // CAD の作業待ち・作業中の件数（同上）
  initialActiveCadCount: number | null
}

export function Sidebar({ initialPreferCollapsed, initialWaitingIntakeCount, initialActiveCadCount }: SidebarProps) {
  const { pathname, collapsed, toggle } = useSidebar(initialPreferCollapsed)
  const waitingIntakeCount = useWaitingIntakeCount(
    initialWaitingIntakeCount,
    initialWaitingIntakeCount !== null
  )
  const activeCadCount = useActiveCadCount(initialActiveCadCount, initialActiveCadCount !== null)
  const badgeCounts: MenuBadgeCounts = {
    intakeWaiting: waitingIntakeCount ?? undefined,
    cadActive: activeCadCount ?? undefined,
  }
  const menu = selectMenu(pathname)

  return (
    <aside
      // 幅は globals.css の変数で持つ（受注登録画面の幅の計算と同じ値を使うため）
      className={`sticky top-[var(--header-height)] flex h-[calc(100dvh-var(--header-height))] shrink-0 flex-col border-r border-line bg-white ${
        collapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]'
      }`}
    >
      <nav aria-label="メニュー" className="flex-1 overflow-y-auto px-2 py-4">
        {/* 部署のメニューでは、ホームに戻るリンクと部署の名前を先頭に出す */}
        {menu.kind === 'shearing' && (
          <div className="mb-3">
            <Link
              href="/"
              title={collapsed ? 'メインメニューに戻る' : undefined}
              className={`flex h-9 items-center gap-2 rounded text-sm text-neutral-600 hover:bg-canvas ${
                collapsed ? 'justify-center' : 'px-3'
              }`}
            >
              <Icon name="arrow-left" className="h-4 w-4 shrink-0" />
              {!collapsed && 'メインメニュー'}
            </Link>
            {!collapsed && (
              <div className="mt-2 rounded border border-line bg-navy-soft px-3 py-2">
                <p className="font-semibold text-navy">シャーリング部</p>
                <p className="text-xs text-neutral-500">本社</p>
              </div>
            )}
          </div>
        )}

        {menu.sections.map((section, index) => (
          <div key={section.title ?? index} className="mb-3">
            {section.title &&
              (collapsed ? (
                // 閉じているときは見出しの代わりに区切り線を出す
                <hr className="mx-2 my-2 border-line" />
              ) : (
                <p className="px-3 pb-1 pt-2 text-xs text-neutral-500">{section.title}</p>
              ))}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <li key={item.label}>
                  <SidebarItem
                    item={item}
                    active={isMenuItemActive(item, pathname)}
                    collapsed={collapsed}
                    badgeCount={item.badge ? badgeCounts[item.badge] : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        <button
          type="button"
          onClick={toggle}
          // aria-expanded は、メニューが開いているかを読み上げに伝える属性
          aria-expanded={!collapsed}
          title={collapsed ? 'メニューを開く' : undefined}
          className={`flex h-9 w-full items-center gap-2 rounded text-sm text-neutral-600 hover:bg-canvas ${
            collapsed ? 'justify-center' : 'px-3'
          }`}
        >
          <Icon name={collapsed ? 'chevrons-right' : 'chevrons-left'} className="h-4 w-4 shrink-0" />
          {!collapsed && 'メニューを閉じる'}
        </button>
      </div>
    </aside>
  )
}
