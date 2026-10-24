import { describe, expect, it } from 'vitest'
import { changedSinceLastPrint } from './load-order-slip'
import {
  deliveryText,
  formatJapanDateTime,
  issueCountText,
  lineColorCss,
  monthDayWithWeekday,
  slipDueDate,
  slipPrintHref,
} from './slip-format'

describe('slipPrintHref', () => {
  it('受注No. だけ。自動の印刷は auto=1', () => {
    expect(slipPrintHref({ no: '26-1003-1' })).toBe('/orders/print?no=26-1003-1')
    expect(slipPrintHref({ no: '26-1003-1', auto: true })).toBe('/orders/print?no=26-1003-1&auto=1')
  })
})

describe('monthDayWithWeekday', () => {
  it('月/日（曜日）。月・日の 0 は付けない', () => {
    expect(monthDayWithWeekday('2026-10-30')).toBe('10/30（金）')
    expect(monthDayWithWeekday('2026-11-01')).toBe('11/1（日）')
    expect(monthDayWithWeekday('2027-01-04')).toBe('1/4（月）')
  })
})

describe('slipDueDate・deliveryText', () => {
  it('確定は日付と配達', () => {
    expect(slipDueDate('確定', '2026-10-30', '宵積み', null)).toEqual({
      main: '10/30（金）',
      provisional: false,
      delivery: '宵積み',
    })
  })

  it('仮納期は仮の印を付ける', () => {
    expect(slipDueDate('仮納期', '2026-10-30', '宵積み', null)).toEqual({
      main: '10/30（金）',
      provisional: true,
      delivery: '宵積み',
    })
  })

  it('後報・最短出荷は日付の代わりに種別を出す', () => {
    expect(slipDueDate('後報', null, '宵積み', null)).toEqual({ main: '後報', provisional: false, delivery: '宵積み' })
    expect(slipDueDate('最短出荷', null, '自社便', null).main).toBe('最短出荷')
  })

  it('配達のフリーの文字を添える', () => {
    expect(deliveryText('自社便', null)).toBe('自社便')
    expect(deliveryText('フリー', '午前中に現場へ')).toBe('フリー（午前中に現場へ）')
  })
})

describe('issueCountText', () => {
  it('2 回目からは再発行を添える', () => {
    expect(issueCountText(1)).toBe('発行 1 回目')
    expect(issueCountText(3)).toBe('発行 3 回目（再発行）')
  })
})

describe('formatJapanDateTime', () => {
  it('日本時間で出す', () => {
    expect(formatJapanDateTime('2026-10-23T05:05:00Z')).toBe('2026/10/23 14:05')
  })
})

describe('lineColorCss', () => {
  it('色の名前・番号・英語の名前を CSS の色にする', () => {
    expect(lineColorCss('青')).toBe('#1d4ed8')
    expect(lineColorCss('青色')).toBe('#1d4ed8')
    expect(lineColorCss('#1E40AF')).toBe('#1E40AF')
    expect(lineColorCss('Blue')).toBe('blue')
  })

  it('空・読めない文字は null', () => {
    expect(lineColorCss(null)).toBeNull()
    expect(lineColorCss(' ')).toBeNull()
    expect(lineColorCss('青と白')).toBeNull()
    expect(lineColorCss('red; background: x')).toBeNull()
  })
})

describe('changedSinceLastPrint', () => {
  it('印刷したときの受注の更新日時と今の値を比べる', () => {
    const summary = { count: 1, lastPrintedAt: '2026-10-23T05:00:00Z', lastOrderUpdatedAt: '2026-10-23T04:00:00+00:00' }
    expect(changedSinceLastPrint(summary, '2026-10-23T04:00:00.000Z')).toBe(false)
    expect(changedSinceLastPrint(summary, '2026-10-23T06:00:00Z')).toBe(true)
    expect(changedSinceLastPrint({ count: 0, lastPrintedAt: null, lastOrderUpdatedAt: null }, '2026-10-23T06:00:00Z')).toBe(false)
  })
})
