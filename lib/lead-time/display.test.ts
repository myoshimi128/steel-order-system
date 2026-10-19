import { describe, expect, it } from 'vitest'
import { displayDays, formatShortDateTime, isMessageVisible } from './display'

describe('isMessageVisible', () => {
  it('表示期限の日までは出し、次の日から出さない', () => {
    expect(isMessageVisible('点検', '2026-10-19', '2026-10-19')).toBe(true)
    expect(isMessageVisible('点検', '2026-10-18', '2026-10-19')).toBe(false)
  })

  it('期限が空なら出し続け、メッセージが空なら出さない', () => {
    expect(isMessageVisible('点検', null, '2026-10-19')).toBe(true)
    expect(isMessageVisible(null, null, '2026-10-19')).toBe(false)
    expect(isMessageVisible('  ', '2026-12-31', '2026-10-19')).toBe(false)
  })
})

describe('displayDays', () => {
  it('要相談と未入力は null（「—」を出す）', () => {
    expect(displayDays({ days: 3, congestion: 'normal' })).toBe(3)
    expect(displayDays({ days: 3, congestion: 'consult' })).toBeNull()
    expect(displayDays({ days: null, congestion: 'busy' })).toBeNull()
  })
})

describe('formatShortDateTime', () => {
  it('日本時間の「月/日 時:分」にする', () => {
    // UTC の 23:15 は日本時間の翌日 08:15
    expect(formatShortDateTime('2026-10-15T23:15:00Z')).toBe('10/16 08:15')
  })
})
