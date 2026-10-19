import { describe, expect, it } from 'vitest'
import { formatReceivedAtLong, nowTimeInJapan, parseTimeInput, toJapanDateTime } from './received-at'

describe('parseTimeInput', () => {
  it('4 桁・3 桁・コロンつきを HH:MM にする', () => {
    expect(parseTimeInput('1040')).toEqual({ ok: true, value: '10:40' })
    expect(parseTimeInput('940')).toEqual({ ok: true, value: '09:40' })
    expect(parseTimeInput('9:40')).toEqual({ ok: true, value: '09:40' })
    expect(parseTimeInput('0005')).toEqual({ ok: true, value: '00:05' })
  })

  it('空・形の違う入力・存在しない時刻はエラー', () => {
    expect(parseTimeInput('').ok).toBe(false)
    expect(parseTimeInput('10').ok).toBe(false)
    expect(parseTimeInput('2460')).toEqual({ ok: false, error: '存在しない時刻です' })
  })
})

describe('toJapanDateTime', () => {
  it('日本時間の日時の文字にする', () => {
    expect(toJapanDateTime('2026-10-16', '10:40')).toBe('2026-10-16T10:40:00+09:00')
  })
})

describe('nowTimeInJapan', () => {
  it('UTC の時刻を日本時間にする', () => {
    expect(nowTimeInJapan(new Date('2026-10-16T01:40:00Z'))).toBe('10:40')
  })
})

describe('formatReceivedAtLong', () => {
  it('年月日（曜日）時刻の形にする', () => {
    expect(formatReceivedAtLong('2026-10-16T00:12:00Z')).toBe('2026/10/16（金）09:12')
  })
})
