import { describe, expect, it } from 'vitest'
import { handlingLabel, handlingStateFor, isHandlingActive } from './handling'

const NOW = new Date('2026-10-19T01:00:00Z')

describe('isHandlingActive', () => {
  it('開始から 30 分未満なら有効', () => {
    expect(isHandlingActive('2026-10-19T00:31:00Z', NOW)).toBe(true)
  })

  it('ちょうど 30 分たったら無効', () => {
    expect(isHandlingActive('2026-10-19T00:30:00Z', NOW)).toBe(false)
  })

  it('開始日時がなければ無効', () => {
    expect(isHandlingActive(null, NOW)).toBe(false)
  })
})

describe('handlingStateFor', () => {
  const base = { handlingByName: '山田', handlingAt: '2026-10-19T00:50:00Z' }

  it('誰も開いていなければ none', () => {
    expect(handlingStateFor({ ...base, handlingBy: null }, 'me', NOW)).toBe('none')
  })

  it('自分が開いていれば self', () => {
    expect(handlingStateFor({ ...base, handlingBy: 'me' }, 'me', NOW)).toBe('self')
  })

  it('ほかの人が開いていれば other', () => {
    expect(handlingStateFor({ ...base, handlingBy: 'other' }, 'me', NOW)).toBe('other')
  })

  it('30 分過ぎていれば、ほかの人でも none', () => {
    expect(
      handlingStateFor({ ...base, handlingBy: 'other', handlingAt: '2026-10-19T00:00:00Z' }, 'me', NOW)
    ).toBe('none')
  })
})

describe('handlingLabel', () => {
  it('名前があれば「○○さんが対応中」', () => {
    expect(handlingLabel('山田')).toBe('山田さんが対応中')
  })

  it('名前がなければ「ほかの人が対応中」', () => {
    expect(handlingLabel(null)).toBe('ほかの人が対応中')
  })
})
