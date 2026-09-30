import { describe, expect, it } from 'vitest'
import { formatDisplayDate, parseDateInput, todayInJapan } from './date'

const TODAY = '2026-09-30'

describe('parseDateInput', () => {
  it('4 桁は今年の月日（1005 → 今年の 10 月 5 日）', () => {
    expect(parseDateInput('1005', TODAY)).toEqual({ ok: true, value: '2026-10-05' })
  })

  it('8 桁は年月日（20271005 → 2027 年 10 月 5 日）', () => {
    expect(parseDateInput('20271005', TODAY)).toEqual({ ok: true, value: '2027-10-05' })
  })

  it('表示中の形（2026/10/05・2026-10-05）もそのまま受け付ける', () => {
    expect(parseDateInput('2026/10/05', TODAY)).toEqual({ ok: true, value: '2026-10-05' })
    expect(parseDateInput('2026-1-5', TODAY)).toEqual({ ok: true, value: '2026-01-05' })
  })

  it('存在しない日付はエラー', () => {
    expect(parseDateInput('0230', TODAY).ok).toBe(false)
    expect(parseDateInput('1301', TODAY).ok).toBe(false)
    expect(parseDateInput('1000', TODAY).ok).toBe(false)
  })

  it('うるう年の 2 月 29 日は、うるう年だけ受け付ける', () => {
    expect(parseDateInput('20280229', TODAY).ok).toBe(true)
    expect(parseDateInput('20270229', TODAY).ok).toBe(false)
  })

  it('空欄・桁数違い・数字以外はエラー', () => {
    expect(parseDateInput('', TODAY).ok).toBe(false)
    expect(parseDateInput('105', TODAY).ok).toBe(false)
    expect(parseDateInput('261005', TODAY).ok).toBe(false)
    expect(parseDateInput('10/5', TODAY).ok).toBe(false)
  })
})

describe('formatDisplayDate', () => {
  it('YYYY-MM-DD を YYYY/MM/DD にする', () => {
    expect(formatDisplayDate('2026-10-05')).toBe('2026/10/05')
    expect(formatDisplayDate('')).toBe('')
  })
})

describe('todayInJapan', () => {
  it('日本時間の日付を返す（UTC では前日でも日本の日付になる）', () => {
    // UTC 2026-12-31 20:00 は 日本時間 2027-01-01 05:00
    expect(todayInJapan(new Date('2026-12-31T20:00:00Z'))).toBe('2027-01-01')
  })
})
