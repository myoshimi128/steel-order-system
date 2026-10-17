'use client'

// サイドメニュー（docs/screen-design.md「共通レイアウト」）。
// ・URL に応じて、ホームのメニューかシャーリング部のメニューを出す（lib/layout/menus.ts）
// ・開閉できる。閉じるとアイコンだけの幅になる。開閉の状態は useSidebar が持ち、cookie に保存する

import Link from 'next/link'
import { Icon } from '@/components/layout/icon'
import { SidebarItem } from '@/components/layout/sidebar-item'
import { isMenuItemActive, selectMenu } from '@/lib/layout/menus'
import { useSidebar } from '@/lib/layout/use-sidebar'

export function Sidebar({ initialPreferCollapsed }: { initialPreferCollapsed: boolean }) {
  const { pathname, collapsed, toggle } = useSidebar(initialPreferCollapsed)
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
