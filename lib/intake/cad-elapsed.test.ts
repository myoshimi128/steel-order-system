import { describe, expect, it } from 'vitest'
import { elapsedMinutes, formatElapsed, isLongRunning } from './cad-elapsed'
import { CAD_LONG_RUNNING_HOURS } from './constants'

const START = '2026-10-20T09:00:00+09:00'
// 開始から minutes 分たった時刻
const after = (minutes: number) => new Date(new Date(START).getTime() + minutes * 60 * 1000)

describe('elapsedMinutes', () => {
  it('開始からの分（端数は切り捨て）', () => {
    expect(elapsedMinutes(START, after(0))).toBe(0)
    expect(elapsedMinutes(START, after(90))).toBe(90)
    expect(elapsedMinutes(START, new Date(after(5).getTime() + 59 * 1000))).toBe(5)
  })

  it('開始が今より後なら 0', () => {
    expect(elapsedMinutes(START, after(-10))).toBe(0)
  })
})

describe('formatElapsed', () => {
  it('1 時間未満は分だけ', () => {
    expect(formatElapsed(0)).toBe('0分')
    expect(formatElapsed(59)).toBe('59分')
  })

  it('1 日未満は時間と分（ちょうどなら分を出さない）', () => {
    expect(formatElapsed(60)).toBe('1時間')
    expect(formatElapsed(200)).toBe('3時間20分')
    expect(formatElapsed(24 * 60 - 1)).toBe('23時間59分')
  })

  it('1 日以上は日と時間（分は出さない）', () => {
    expect(formatElapsed(24 * 60)).toBe('1日')
    expect(formatElapsed(28 * 60 + 30)).toBe('1日4時間')
    expect(formatElapsed(3 * 24 * 60 + 60)).toBe('3日1時間')
  })
})

describe('isLongRunning', () => {
  it('基準の時間の 1 分前までは目立たせない', () => {
    expect(isLongRunning(START, after(CAD_LONG_RUNNING_HOURS * 60 - 1))).toBe(false)
  })

  it('基準の時間ちょうどから目立たせる', () => {
    expect(isLongRunning(START, after(CAD_LONG_RUNNING_HOURS * 60))).toBe(true)
    expect(isLongRunning(START, after(CAD_LONG_RUNNING_HOURS * 60 + 300))).toBe(true)
  })

  it('基準の時間を渡して変えられる', () => {
    expect(isLongRunning(START, after(8 * 60), 8)).toBe(true)
    expect(isLongRunning(START, after(8 * 60 - 1), 8)).toBe(false)
  })

  it('開始日時がなければ目立たせない', () => {
    expect(isLongRunning(null, after(10_000))).toBe(false)
  })
})
