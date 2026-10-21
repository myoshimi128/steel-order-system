import { describe, expect, it } from 'vitest'
import {
  countQueueBySite,
  countScopeSiteId,
  filterQueueUnits,
  queueHref,
  queueNoticeText,
  queueOriginLabel,
  rowsForQueueSite,
  selectQueueSite,
  type QueueSite,
} from './queue'
import type { QueueUnit } from './types'

const SITES: QueueSite[] = [
  { id: 's1', number: 1, code: 'honsha', name: '本社' },
  { id: 's2', number: 2, code: 'a', name: 'A営業所' },
]

const unit = (id: string, overrides: Partial<QueueUnit> = {}): QueueUnit => ({
  id,
  kind: 'sakisun',
  origin: 'split',
  note: null,
  readyAt: null,
  hasCsv: false,
  intakeId: `intake-${id}`,
  intakeNo: null,
  customerName: null,
  projectName: null,
  dueDateType: null,
  dueDate: null,
  isUrgent: false,
  siteId: 's1',
  staffName: null,
  registeredAt: null,
  ...overrides,
})

describe('selectQueueSite', () => {
  it('URL のコードの営業所を開く', () => {
    expect(selectQueueSite(SITES, 'a', 's1')?.id).toBe('s2')
  })

  it('指定がない・知らないコードなら、ユーザーの営業所', () => {
    expect(selectQueueSite(SITES, undefined, 's2')?.id).toBe('s2')
    expect(selectQueueSite(SITES, 'x', 's2')?.id).toBe('s2')
  })

  it('ユーザーの営業所もなければ先頭の営業所', () => {
    expect(selectQueueSite(SITES, undefined, null)?.id).toBe('s1')
    expect(selectQueueSite([], undefined, null)).toBeNull()
  })
})

describe('queueHref / queueNoticeText', () => {
  it('タブとお知らせを URL に付ける', () => {
    expect(queueHref()).toBe('/orders/queue')
    expect(queueHref({ site: 'a', notice: 'completed', no: '26-1003' })).toBe(
      '/orders/queue?site=a&notice=completed&no=26-1003'
    )
  })

  it('お知らせの文（知らない値は null）', () => {
    expect(queueNoticeText('added-aitore', '26-1003')).toContain('CAD の作業待ち')
    expect(queueNoticeText('completed', '26-1003')).toBe('受付No. 26-1003 の区分の起票を完了し、一覧から外しました')
    expect(queueNoticeText('x', undefined)).toBeNull()
  })
})

describe('countQueueBySite / rowsForQueueSite', () => {
  const units = [
    unit('late', { dueDate: '2026-10-24' }),
    unit('urgent', { isUrgent: true, dueDate: '2026-10-30' }),
    unit('none', { dueDate: null }),
    unit('early', { dueDate: '2026-10-03' }),
    unit('other-site', { siteId: 's2' }),
  ]

  it('営業所ごとの件数', () => {
    const counts = countQueueBySite(units)
    expect(counts.get('s1')).toBe(4)
    expect(counts.get('s2')).toBe(1)
  })

  it('タブの営業所の行だけを、至急 → 納期の早い順 → 日付なし で並べる', () => {
    expect(rowsForQueueSite(units, 's1').map((u) => u.id)).toEqual(['urgent', 'early', 'late', 'none'])
  })
})

describe('filterQueueUnits / queueOriginLabel', () => {
  it('受付No.・売り先・工事名で絞り込む', () => {
    const units = [
      unit('a', { intakeNo: '26-1003', customerName: 'A製作所' }),
      unit('b', { intakeNo: '26-1010', projectName: 'PL 9mm 3枚' }),
    ]
    expect(filterQueueUnits(units, '1010').map((u) => u.id)).toEqual(['b'])
    expect(filterQueueUnits(units, 'pl 9').map((u) => u.id)).toEqual(['b'])
    expect(filterQueueUnits(units, '')).toHaveLength(2)
  })

  it('追加の列は、振り分けで作られた区分なら空', () => {
    expect(queueOriginLabel(unit('a'))).toBe('')
    expect(queueOriginLabel(unit('b', { origin: 'oversight' }))).toBe('見落とし追加')
    expect(queueOriginLabel(unit('c', { origin: 'verbal' }))).toBe('口頭')
  })
})

describe('countScopeSiteId', () => {
  it('管理者は全部の営業所（null）', () => {
    expect(countScopeSiteId({ role: 'admin', siteId: 's1' })).toBeNull()
  })

  it('事務はユーザーの営業所。営業所が空なら全部', () => {
    expect(countScopeSiteId({ role: 'office', siteId: 's2' })).toBe('s2')
    expect(countScopeSiteId({ role: 'office', siteId: null })).toBeNull()
  })
})
