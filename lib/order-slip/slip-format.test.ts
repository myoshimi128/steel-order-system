import { describe, expect, it } from 'vitest'
import { changedSinceLastPrint } from './load-order-slip'
import {
  deliveryText,
  dueDateText,
  formatJapanDateTime,
  issueCountText,
  lineColorCss,
  parseSlipCopy,
  slipPrintHref,
} from './slip-format'

describe('slipPrintHref・parseSlipCopy', () => {
  it('現場用は copy を付けない。単価記入用は copy=price、自動の印刷は auto=1', () => {
    expect(slipPrintHref({ no: '26-1003-1' })).toBe('/orders/print?no=26-1003-1')
    expect(slipPrintHref({ no: '26-1003-1', copy: '単価記入用' })).toBe('/orders/print?no=26-1003-1&copy=price')
    expect(slipPrintHref({ no: '26-1003-1', auto: true })).toBe('/orders/print?no=26-1003-1&auto=1')
  })

  it('知らない値は現場用', () => {
    expect(parseSlipCopy('price')).toBe('単価記入用')
    expect(parseSlipCopy('field')).toBe('現場用')
    expect(parseSlipCopy(undefined)).toBe('現場用')
    expect(parseSlipCopy(['price'])).toBe('現場用')
  })
})

describe('dueDateText・deliveryText', () => {
  it('確定・仮納期は日付、後報・最短出荷は種別', () => {
    expect(dueDateText('確定', '2026-10-30')).toBe('2026/10/30')
    expect(dueDateText('仮納期', '2026-10-30')).toBe('2026/10/30（仮納期）')
    expect(dueDateText('後報', null)).toBe('後報')
    expect(dueDateText('最短出荷', null)).toBe('最短出荷')
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
