import { describe, expect, it } from 'vitest'
import {
  formatShipmentNo,
  normalizeShipmentNo,
  parseShipmentNo,
  shipmentNewHref,
  shipmentPrintHref,
  shipmentsHref,
  shipmentsNoticeText,
  shipmentViewHref,
} from './shipment-no'

describe('formatShipmentNo', () => {
  it('回数は 2 桁にそろえる', () => {
    expect(formatShipmentNo('26-0001-1', 1)).toBe('26-0001-1-01')
    expect(formatShipmentNo('26-0001-1', 12)).toBe('26-0001-1-12')
  })

  it('100 回目からは桁を増やす（切らない）', () => {
    expect(formatShipmentNo('26-0001-1', 100)).toBe('26-0001-1-100')
  })
})

describe('normalizeShipmentNo', () => {
  it('ハイフン区切りはそのまま', () => {
    expect(normalizeShipmentNo('26-0001-1-01')).toBe('26-0001-1-01')
    expect(normalizeShipmentNo(' 26-1003-2-02 ')).toBe('26-1003-2-02')
  })

  it('受注No. と同じ決まりでそろえる（空白区切り・0 埋め・回数は 2 桁）', () => {
    expect(normalizeShipmentNo('26 1 1 1')).toBe('26-0001-1-01')
    expect(normalizeShipmentNo('26-1003-01-2')).toBe('26-1003-1-02')
  })

  it('受付No. の部分はハイフンなしでもよい', () => {
    expect(normalizeShipmentNo('260001-1-1')).toBe('26-0001-1-01')
  })

  it('形にならなければ null', () => {
    expect(normalizeShipmentNo('')).toBeNull()
    expect(normalizeShipmentNo('26-0001-1')).toBeNull()
    expect(normalizeShipmentNo('2600011')).toBeNull()
    expect(normalizeShipmentNo('26-0001-1-0')).toBeNull()
  })
})

describe('parseShipmentNo', () => {
  it('受注No. と回数に分ける', () => {
    expect(parseShipmentNo('26-0001-1-03')).toEqual({ orderNo: '26-0001-1', seq: 3 })
  })
})

describe('画面の URL', () => {
  it('入口', () => {
    expect(shipmentsHref()).toBe('/shipments')
    expect(shipmentsHref({ site: 'a' })).toBe('/shipments?site=a')
    expect(shipmentsHref({ notice: 'deleted', no: '26-0001-1-01' })).toBe('/shipments?notice=deleted&no=26-0001-1-01')
  })

  it('入力・確認・印刷', () => {
    expect(shipmentNewHref('26-0001-1')).toBe('/shipments/new?order=26-0001-1')
    expect(shipmentViewHref('26-0001-1-01')).toBe('/shipments/view?no=26-0001-1-01')
    expect(shipmentViewHref('26-0001-1-01', true)).toBe('/shipments/view?no=26-0001-1-01&issued=1')
    expect(shipmentPrintHref({ no: '26-0001-1-01', auto: true })).toBe('/shipments/print?no=26-0001-1-01&auto=1')
  })
})

describe('shipmentsNoticeText', () => {
  it('取り消しのお知らせ', () => {
    expect(shipmentsNoticeText('deleted', '26-0001-1-01')).toBe('送り状No. 26-0001-1-01 を取り消しました')
    expect(shipmentsNoticeText('unknown', '26-0001-1-01')).toBeNull()
  })
})
