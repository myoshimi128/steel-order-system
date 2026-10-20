import { describe, expect, it } from 'vitest'
import { sortByQueueOrder, type QueueSortKey } from './sort'

type Row = QueueSortKey & { id: string }

const row = (id: string, isUrgent: boolean, dueDate: string | null, registeredAt: string | null): Row => ({
  id,
  isUrgent,
  dueDate,
  registeredAt,
})

const ids = (rows: Row[]) => sortByQueueOrder(rows).map((r) => r.id)

describe('sortByQueueOrder', () => {
  it('至急を先に並べる（納期が遅くても）', () => {
    expect(ids([row('a', false, '2026-10-01', null), row('b', true, '2026-12-01', null)])).toEqual(['b', 'a'])
  })

  it('納期の日付が早い順、日付なしはその後', () => {
    expect(
      ids([
        row('none', false, null, '2026-10-01T00:00:00Z'),
        row('late', false, '2026-10-24', '2026-10-01T00:00:00Z'),
        row('early', false, '2026-10-03', '2026-10-02T00:00:00Z'),
      ])
    ).toEqual(['early', 'late', 'none'])
  })

  it('至急の中でも納期の順', () => {
    expect(ids([row('a', true, null, null), row('b', true, '2026-10-05', null)])).toEqual(['b', 'a'])
  })

  it('同じ納期なら受付登録が古い順、登録日時なしは最後', () => {
    expect(
      ids([
        row('none', false, '2026-10-03', null),
        row('new', false, '2026-10-03', '2026-10-15T10:00:00Z'),
        row('old', false, '2026-10-03', '2026-10-14T10:00:00Z'),
      ])
    ).toEqual(['old', 'new', 'none'])
  })

  it('渡した配列は変えない', () => {
    const rows = [row('a', false, '2026-10-05', null), row('b', true, null, null)]
    sortByQueueOrder(rows)
    expect(rows.map((r) => r.id)).toEqual(['a', 'b'])
  })
})
