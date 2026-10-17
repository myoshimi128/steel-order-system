'use client'

// サイドメニューの開閉状態を持つカスタムフック（docs/screen-design.md「共通レイアウト」）。
// 開閉の決め方は sidebar-state.ts の純粋な関数に任せ、ここでは状態の保持と cookie への保存だけを行う。

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  isSidebarCollapsed,
  sidebarCookieString,
  toggleSidebar,
  type SidebarState,
} from '@/lib/layout/sidebar-state'

// initialPreferCollapsed: サーバー（app/(main)/layout.tsx）が cookie から読んだ、保存されている好み
export function useSidebar(initialPreferCollapsed: boolean) {
  // 今の画面の URL。サーバーでの描画でも値が入るため、最初の表示から正しい開閉で描ける
  const pathname = usePathname()

  const [state, setState] = useState<SidebarState>({
    preferCollapsed: initialPreferCollapsed,
    openedOnPath: null,
  })

  const collapsed = isSidebarCollapsed(state, pathname)

  function toggle() {
    const next = toggleSidebar(state, pathname)
    setState(next.state)
    if (next.persist) {
      // ブラウザ側で cookie を書き換える。次にページを読み込んだとき、サーバーがこの値を読む
      document.cookie = sidebarCookieString(next.state.preferCollapsed)
    }
  }

  return { pathname, collapsed, toggle }
}
