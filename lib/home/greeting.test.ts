import { describe, expect, it } from 'vitest'
import { formatJapaneseDate, greetingFor } from './greeting'

// 日本時間の時刻を作る（日本は UTC+9 のため、9 時間引いた UTC の時刻にする）
const jst = (iso: string) => new Date(`${iso}+09:00`)

describe('greetingFor', () => {
  it('時刻であいさつを変える（日本時間）', () => {
    expect(greetingFor(jst('2026-10-19T04:59:00'))).toBe('こんばんは')
    expect(greetingFor(jst('2026-10-19T05:00:00'))).toBe('おはようございます')
    expect(greetingFor(jst('2026-10-19T10:59:00'))).toBe('おはようございます')
    expect(greetingFor(jst('2026-10-19T11:00:00'))).toBe('こんにちは')
    expect(greetingFor(jst('2026-10-19T16:59:00'))).toBe('こんにちは')
    expect(greetingFor(jst('2026-10-19T17:00:00'))).toBe('こんばんは')
    expect(greetingFor(jst('2026-10-19T00:30:00'))).toBe('こんばんは')
  })
})

describe('formatJapaneseDate', () => {
  it('年月日と曜日（日本時間）', () => {
    expect(formatJapaneseDate(jst('2026-10-19T09:00:00'))).toBe('2026年10月19日（月）')
    // UTC ではまだ前日でも、日本時間の日付にする
    expect(formatJapaneseDate(new Date('2026-10-15T23:30:00Z'))).toBe('2026年10月16日（金）')
  })
})
