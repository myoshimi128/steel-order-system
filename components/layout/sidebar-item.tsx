// サイドメニューの 1 項目。
// リンク先がある項目はリンク、まだ作っていない画面（href が null）は押せない「準備中」の表示にする。
// 閉じた状態ではアイコンだけを出し、名前はマウスを乗せたときの表示（title）で見せる。

import Link from 'next/link'
import { Icon } from '@/components/layout/icon'
import type { MenuItem } from '@/lib/layout/menus'

export function SidebarItem({
  item,
  active,
  collapsed,
}: {
  item: MenuItem
  active: boolean
  collapsed: boolean
}) {
  const content = (
    <>
      <Icon name={item.icon} className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="truncate">{item.label}</span>
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
  const title = collapsed ? item.label : undefined
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
