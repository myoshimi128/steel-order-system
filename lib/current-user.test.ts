import { describe, expect, it } from 'vitest'
import { formatAffiliation } from './current-user'

describe('formatAffiliation', () => {
  it('営業所と部署をつなげる', () => {
    expect(formatAffiliation({ siteName: '本社', department: 'shearing' })).toBe('本社シャーリング部')
  })

  it('未設定の方は出さない', () => {
    expect(formatAffiliation({ siteName: null, department: 'processing' })).toBe('加工部')
    expect(formatAffiliation({ siteName: 'A営業所', department: null })).toBe('A営業所')
    expect(formatAffiliation({ siteName: null, department: null })).toBe('')
  })
})
