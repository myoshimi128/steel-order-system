import { describe, expect, it } from 'vitest'
import { filterCandidates, shipmentStatusLabel, sortCandidates, type ShipmentCandidate } from './candidates'

function candidate(overrides: Partial<ShipmentCandidate>): ShipmentCandidate {
  return {
    id: overrides.orderNo ?? 'x',
    orderNo: '26-0001-1',
    status: '加工待ち',
    isUrgent: false,
    siteId: 'site',
    customerName: '得意先A',
    destinationName: '納入先A',
    projectName: null,
    dueDateType: '確定',
    dueDate: '2026-11-10',
    deliveryMethodName: '午前',
    deliveryMethodNote: null,
    orderedQuantity: 10,
    remainingQuantity: 10,
    ...overrides,
  }
}

describe('sortCandidates', () => {
  it('最短出荷 → 納期の早い順（仮納期も日付で）→ 後報。同じなら受注No. の順', () => {
    const rows = [
      candidate({ orderNo: '26-0005-1', dueDateType: '後報', dueDate: null }),
      candidate({ orderNo: '26-0004-1', dueDate: '2026-11-12' }),
      candidate({ orderNo: '26-0003-1', dueDateType: '仮納期', dueDate: '2026-11-08' }),
      candidate({ orderNo: '26-0010-1', dueDate: '2026-11-12' }),
      candidate({ orderNo: '26-0002-1', dueDateType: '最短出荷', dueDate: null }),
    ]
    expect(sortCandidates(rows).map((row) => row.orderNo)).toEqual([
      '26-0002-1',
      '26-0003-1',
      '26-0004-1',
      '26-0010-1',
      '26-0005-1',
    ])
  })
})

describe('shipmentStatusLabel', () => {
  it('配送依頼済みで残りがあれば一部出荷', () => {
    expect(shipmentStatusLabel('配送依頼済み', 3)).toBe('一部出荷（残り 3）')
    expect(shipmentStatusLabel('配送依頼済み', 0)).toBe('配送依頼済み')
    expect(shipmentStatusLabel('加工待ち', 10)).toBe('加工待ち')
  })
})

describe('filterCandidates', () => {
  it('受注No.・得意先・納入先・工事名で絞り込む', () => {
    const rows = [candidate({ orderNo: '26-0001-1', projectName: '倉庫新築' }), candidate({ orderNo: '26-0002-1', customerName: '得意先B' })]
    expect(filterCandidates(rows, '倉庫').map((row) => row.orderNo)).toEqual(['26-0001-1'])
    expect(filterCandidates(rows, '得意先B').map((row) => row.orderNo)).toEqual(['26-0002-1'])
    expect(filterCandidates(rows, ' ')).toHaveLength(2)
  })
})
