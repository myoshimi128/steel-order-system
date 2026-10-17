import { describe, expect, it } from 'vitest'
import {
  HOME_MENU,
  SHEARING_MENU,
  buildBreadcrumbs,
  isMenuItemActive,
  selectMenu,
  type MenuItem,
} from './menus'

// メニューの中から、ラベルで項目を探すヘルパー
function findItem(label: string, menu = SHEARING_MENU): MenuItem {
  const item = menu.sections.flatMap((section) => section.items).find((i) => i.label === label)
  if (!item) throw new Error(`メニューに ${label} がありません`)
  return item
}

describe('selectMenu', () => {
  it('ホームではホームのメニュー', () => {
    expect(selectMenu('/').kind).toBe('home')
  })

  it('それ以外の画面ではシャーリング部のメニュー', () => {
    expect(selectMenu('/shearing').kind).toBe('shearing')
    expect(selectMenu('/orders/new').kind).toBe('shearing')
    expect(selectMenu('/masters/customers').kind).toBe('shearing')
  })
})

describe('isMenuItemActive', () => {
  it('受注登録は /orders 以下のどの画面でも強調する', () => {
    const item = findItem('受注登録')
    expect(isMenuItemActive(item, '/orders/new')).toBe(true)
    expect(isMenuItemActive(item, '/orders')).toBe(true)
    expect(isMenuItemActive(item, '/orders-archive')).toBe(false)
  })

  it('マスタ管理は個別のマスタの画面でも強調する', () => {
    expect(isMenuItemActive(findItem('マスタ管理'), '/masters/customers/new')).toBe(true)
  })

  it('部署ホームは /shearing のときだけ強調する（完全一致）', () => {
    const item = findItem('部署ホーム')
    expect(isMenuItemActive(item, '/shearing')).toBe(true)
    expect(isMenuItemActive(item, '/orders/new')).toBe(false)
  })

  it('準備中の項目は強調しない', () => {
    expect(isMenuItemActive(findItem('CAD'), '/cad')).toBe(false)
  })

  it('ホームのメニューのホームは / のときだけ強調する', () => {
    const item = findItem('ホーム', HOME_MENU)
    expect(isMenuItemActive(item, '/')).toBe(true)
    expect(isMenuItemActive(item, '/shearing')).toBe(false)
  })
})

describe('buildBreadcrumbs', () => {
  it('ホームでは何も出さない', () => {
    expect(buildBreadcrumbs('/')).toEqual([])
  })

  it('部署ホームではシャーリング部だけ（リンクなし）', () => {
    expect(buildBreadcrumbs('/shearing')).toEqual([{ label: 'シャーリング部', href: null }])
  })

  it('業務の画面では シャーリング部 › 画面名', () => {
    expect(buildBreadcrumbs('/orders/new')).toEqual([
      { label: 'シャーリング部', href: '/shearing' },
      { label: '受注登録', href: null },
    ])
    expect(buildBreadcrumbs('/masters/customers/new')).toEqual([
      { label: 'シャーリング部', href: '/shearing' },
      { label: 'マスタ管理', href: null },
    ])
  })

  it('メニューにない画面はシャーリング部だけ', () => {
    expect(buildBreadcrumbs('/unknown')).toEqual([{ label: 'シャーリング部', href: '/shearing' }])
  })
})
