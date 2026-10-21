import { describe, expect, it } from 'vitest'
import { countBySite, selectSiteTab, type SiteTab } from './site-tabs'

const SITES: SiteTab[] = [
  { id: 's1', number: 1, code: 'honsha', name: '本社' },
  { id: 's2', number: 2, code: 'a', name: 'A営業所' },
]

describe('selectSiteTab', () => {
  it('URL のコードの営業所を開く', () => {
    expect(selectSiteTab(SITES, 'a', 's1')?.id).toBe('s2')
  })

  it('指定がない・知らないコードなら、ユーザーの営業所', () => {
    expect(selectSiteTab(SITES, undefined, 's2')?.id).toBe('s2')
    expect(selectSiteTab(SITES, 'x', 's2')?.id).toBe('s2')
  })

  it('ユーザーの営業所もなければ先頭の営業所', () => {
    expect(selectSiteTab(SITES, undefined, null)?.id).toBe('s1')
    expect(selectSiteTab([], undefined, null)).toBeNull()
  })
})

describe('countBySite', () => {
  it('営業所ごとに数え、営業所が空の行は数えない', () => {
    const counts = countBySite([{ siteId: 's1' }, { siteId: 's1' }, { siteId: 's2' }, { siteId: null }])
    expect(counts.get('s1')).toBe(2)
    expect(counts.get('s2')).toBe(1)
    expect(counts.size).toBe(2)
  })
})
