import { describe, expect, it } from 'vitest'
import {
  isSidebarCollapsed,
  isSidebarForcedClosed,
  parseSidebarCookie,
  sidebarCookieString,
  toggleSidebar,
  type SidebarState,
} from './sidebar-state'

const OPEN: SidebarState = { preferCollapsed: false, openedOnPath: null }

describe('parseSidebarCookie / sidebarCookieString', () => {
  it("'1' だけが閉じた状態", () => {
    expect(parseSidebarCookie('1')).toBe(true)
    expect(parseSidebarCookie('0')).toBe(false)
    expect(parseSidebarCookie(undefined)).toBe(false)
  })

  it('保存する文字列に値・パス・有効期限が入る', () => {
    expect(sidebarCookieString(true)).toBe(
      'sidebar_collapsed=1; path=/; max-age=31536000; samesite=lax'
    )
  })
})

describe('isSidebarForcedClosed', () => {
  it('受注登録の画面だけ閉じた状態で始める', () => {
    expect(isSidebarForcedClosed('/orders/new')).toBe(true)
    expect(isSidebarForcedClosed('/masters')).toBe(false)
    expect(isSidebarForcedClosed('/')).toBe(false)
  })
})

describe('isSidebarCollapsed', () => {
  it('ふつうの画面は保存した好みに従う', () => {
    expect(isSidebarCollapsed(OPEN, '/masters')).toBe(false)
    expect(isSidebarCollapsed({ ...OPEN, preferCollapsed: true }, '/masters')).toBe(true)
  })

  it('受注登録の画面は、好みが開いていても閉じる', () => {
    expect(isSidebarCollapsed(OPEN, '/orders/new')).toBe(true)
  })

  it('受注登録の画面で手で開いたら、その画面の間だけ開く', () => {
    const state = { ...OPEN, openedOnPath: '/orders/new' }
    expect(isSidebarCollapsed(state, '/orders/new')).toBe(false)
    // 別の受注の画面に移ったら、また閉じた状態で始まる
    expect(isSidebarCollapsed(state, '/orders/edit')).toBe(true)
  })
})

describe('toggleSidebar', () => {
  it('ふつうの画面では好みを切り替えて、保存する', () => {
    const result = toggleSidebar(OPEN, '/masters')
    expect(result.state.preferCollapsed).toBe(true)
    expect(result.persist).toBe(true)
  })

  it('受注登録の画面では好みを変えず、保存しない', () => {
    const opened = toggleSidebar(OPEN, '/orders/new')
    expect(opened.state).toEqual({ preferCollapsed: false, openedOnPath: '/orders/new' })
    expect(opened.persist).toBe(false)

    // もう一度押すと閉じる
    const closed = toggleSidebar(opened.state, '/orders/new')
    expect(closed.state.openedOnPath).toBeNull()
    expect(closed.persist).toBe(false)
  })
})
