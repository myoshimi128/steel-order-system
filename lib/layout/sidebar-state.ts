// サイドメニューの開閉状態の決め方（docs/screen-design.md「共通レイアウト」）。
//
// ・開閉の好みは cookie に保存する。サーバーが最初の表示から正しい状態で描けるようにするため
//   （localStorage はサーバーから読めず、画面を開いた瞬間にいったん開いた状態で描かれてちらつく）
// ・受注登録の画面は、伝票の明細に幅を使うため、保存した好みに関係なく閉じた状態で始める。
//   その画面で開いても好みは書き換えない（ほかの画面の開閉の好みを崩さないため）

// cookie の名前と値。'1' が閉じた状態、それ以外（なし・'0'）は開いた状態
export const SIDEBAR_COOKIE_NAME = 'sidebar_collapsed'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 年（秒）

// cookie の値から、保存されている好み（閉じるか）を読む
export function parseSidebarCookie(value: string | undefined): boolean {
  return value === '1'
}

// 保存する cookie の文字列（document.cookie にそのまま代入する形）
export function sidebarCookieString(collapsed: boolean): string {
  return `${SIDEBAR_COOKIE_NAME}=${collapsed ? '1' : '0'}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}; samesite=lax`
}

// 保存した好みに関係なく、閉じた状態で始める画面か（受注登録の画面）
export function isSidebarForcedClosed(pathname: string): boolean {
  return pathname === '/orders' || pathname.startsWith('/orders/')
}

export type SidebarState = {
  // 保存されている好み（閉じるか）
  preferCollapsed: boolean
  // 閉じた状態で始める画面で、手で開いた画面の URL。別の画面に移ると当てはまらなくなり、また閉じた状態で始まる
  openedOnPath: string | null
}

// 今の画面で閉じた状態にするか
export function isSidebarCollapsed(state: SidebarState, pathname: string): boolean {
  if (isSidebarForcedClosed(pathname)) {
    return state.openedOnPath !== pathname
  }
  return state.preferCollapsed
}

// 開閉のボタンを押したときの新しい状態。
// persist が true のときだけ、呼び出し側で cookie に保存する
export function toggleSidebar(
  state: SidebarState,
  pathname: string
): { state: SidebarState; persist: boolean } {
  if (isSidebarForcedClosed(pathname)) {
    const opened = state.openedOnPath === pathname
    return { state: { ...state, openedOnPath: opened ? null : pathname }, persist: false }
  }
  return { state: { ...state, preferCollapsed: !state.preferCollapsed }, persist: true }
}
