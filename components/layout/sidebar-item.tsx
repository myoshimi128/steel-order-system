// サイドメニューの 1 項目。
// リンク先がある項目はリンク、まだ作っていない画面（href が null）は押せない「準備中」の表示にする。
// 閉じた状態ではアイコンだけを出し、名前はマウスを乗せたときの表示（title）で見せる。
// 件数のバッジ（受付待ちの件数など）は、1 件以上のときだけ出す（閉じた状態ではアイコンの右上に小さく出す）。

import Link from 'next/link'
import { Icon } from '@/components/layout/icon'
import type { MenuItem } from '@/lib/layout/menus'

// バッジに出す数（100 件以上は「99+」）
function formatMenuBadge(count: number): string {
  return count > 99 ? '99+' : String(count)
}

export function SidebarItem({
  item,
  active,
  collapsed,
  badgeCount,
}: {
  item: MenuItem
  active: boolean
  collapsed: boolean
  // 件数のバッジ（出さない項目は undefined）
  badgeCount?: number
}) {
  const showBadge = badgeCount !== undefined && badgeCount > 0
  const content = (
    <>
      <span className="relative shrink-0">
        <Icon name={item.icon} className="h-5 w-5" />
        {collapsed && showBadge && (
          <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy px-1 text-[9px] font-bold leading-none text-white">
            {formatMenuBadge(badgeCount)}
          </span>
        )}
      </span>
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
          {showBadge && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-bold leading-none text-white">
              {formatMenuBadge(badgeCount)}
            </span>
          )}
          {item.proposal && (
            <span className="ml-auto rounded border border-line px-1 text-[10px] text-neutral-500">
              提案
            </span>
          )}
        </>
      )}
    </>
  )

  // 閉じているときは名前が見えないため、マウスを乗せたときに名前を出す
  const title = collapsed
    ? showBadge
      ? `${item.label}（${badgeCount} 件）`
      : item.label
    : undefined
  const layout = `flex h-10 items-center gap-3 rounded text-sm ${collapsed ? 'justify-center' : 'px-3'}`

  if (item.href === null) {
    return (
      <span
        className={`${layout} cursor-not-allowed text-neutral-400`}
        title={collapsed ? `${item.label}（準備中）` : '準備中'}
        aria-disabled="true"
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      href={item.href}
      title={title}
      // aria-current は、今開いている画面の項目であることを読み上げに伝える属性
      aria-current={active ? 'page' : undefined}
      className={`${layout} ${
        active
          ? 'border-l-4 border-navy bg-navy-soft font-semibold text-navy'
          : 'text-neutral-700 hover:bg-canvas'
      }`}
    >
      {content}
    </Link>
  )
}
