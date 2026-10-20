import { describe, expect, it } from 'vitest'
import { intakeListHref, intakeNoticeText, parseIntakeTab } from './tabs'

describe('parseIntakeTab', () => {
  it('知っているタブはそのまま、それ以外は受付待ち', () => {
    expect(parseIntakeTab('registered')).toBe('registered')
    expect(parseIntakeTab('excluded')).toBe('excluded')
    expect(parseIntakeTab('closed')).toBe('waiting')
    expect(parseIntakeTab(undefined)).toBe('waiting')
    expect(parseIntakeTab(['registered'])).toBe('waiting')
  })
})

describe('intakeListHref', () => {
  it('受付待ちのタブは tab を付けない', () => {
    expect(intakeListHref({})).toBe('/intake')
    expect(intakeListHref({ tab: 'waiting', selected: 'abc' })).toBe('/intake?selected=abc')
  })

  it('タブ・お知らせ・受付No. を付ける', () => {
    expect(intakeListHref({ tab: 'registered', notice: 'registered', no: '26-0003' })).toBe(
      '/intake?tab=registered&notice=registered&no=26-0003'
    )
  })
})

describe('intakeNoticeText', () => {
  it('種類ごとの文', () => {
    expect(intakeNoticeText('registered', '26-0003')).toBe('受付No. 26-0003 を発行して受付登録しました')
    expect(intakeNoticeText('deleted', '26-0003')).toBe('受付No. 26-0003 を削除しました')
    expect(intakeNoticeText('dispatched', '26-0003')).toBe(
      '受付No. 26-0003 の振り分けを完了しました（先寸は受注登録待ち、アイトレは CAD へ）'
    )
  })

  it('知らない種類なら null', () => {
    expect(intakeNoticeText('unknown', '26-0003')).toBeNull()
    expect(intakeNoticeText(undefined, undefined)).toBeNull()
  })
})
