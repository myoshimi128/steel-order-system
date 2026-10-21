import { describe, expect, it } from 'vitest'
import {
  cadHref,
  cadUnitsForSite,
  countActiveCadBySite,
  cadStatusLabel,
  countCadTabs,
  filterCadUnits,
  longDueDateText,
  parseCadTab,
  rowsForCadTab,
  shortDueDateText,
} from './cad'
import type { CadUnit } from './types'

const unit = (id: string, overrides: Partial<CadUnit> = {}): CadUnit => ({
  id,
  status: 'cad_waiting',
  assigneeId: null,
  assigneeName: null,
  startedAt: null,
  readyAt: null,
  intakeId: `intake-${id}`,
  intakeNo: null,
  customerName: null,
  projectName: null,
  dueDateType: null,
  dueDate: null,
  deliveryMethodName: null,
  isUrgent: false,
  siteId: 's1',
  siteName: null,
  registeredAt: null,
  hasSakisun: false,
  drawings: [],
  csvFiles: [],
  orderPdfs: [],
  ...overrides,
})

describe('parseCadTab / cadHref', () => {
  it('csv 以外は作業待ち・作業中', () => {
    expect(parseCadTab('csv')).toBe('csv')
    expect(parseCadTab(undefined)).toBe('active')
    expect(parseCadTab('x')).toBe('active')
  })

  it('作業待ち・作業中のタブは ?tab= を付けない', () => {
    expect(cadHref({})).toBe('/cad')
    expect(cadHref({ tab: 'active', unit: 'u1' })).toBe('/cad?unit=u1')
    expect(cadHref({ tab: 'csv', unit: 'u1' })).toBe('/cad?tab=csv&unit=u1')
    expect(cadHref({ site: 'a', tab: 'csv', unit: 'u1' })).toBe('/cad?site=a&tab=csv&unit=u1')
  })
})

describe('cadUnitsForSite / countActiveCadBySite', () => {
  const units = [
    unit('w1', { siteId: 's1' }),
    unit('k1', { siteId: 's1', status: 'cad_working' }),
    unit('r1', { siteId: 's1', status: 'ready' }),
    unit('w2', { siteId: 's2' }),
    unit('none', { siteId: null }),
  ]

  it('加工場所のタブの行は、その営業所のアイトレだけ', () => {
    expect(cadUnitsForSite(units, 's1').map((u) => u.id)).toEqual(['w1', 'k1', 'r1'])
  })

  it('加工場所のタブの件数は、作業待ち・作業中だけを数える（CSV 登録済・営業所なしは数えない）', () => {
    const counts = countActiveCadBySite(units)
    expect(counts.get('s1')).toBe(2)
    expect(counts.get('s2')).toBe(1)
    expect(counts.size).toBe(2)
  })
})

describe('countCadTabs / rowsForCadTab', () => {
  const units = [
    unit('waiting-late', { dueDate: '2026-10-24' }),
    unit('working-urgent', { status: 'cad_working', isUrgent: true, dueDate: '2026-10-30' }),
    unit('waiting-early', { dueDate: '2026-10-03' }),
    unit('csv-old', { status: 'ready', readyAt: '2026-10-15T10:00:00Z', isUrgent: true }),
    unit('csv-new', { status: 'ready', readyAt: '2026-10-16T10:00:00Z' }),
  ]

  it('タブごとの件数（作業待ちと作業中は同じタブ）', () => {
    expect(countCadTabs(units)).toEqual({ active: 3, csv: 2 })
  })

  it('作業待ち・作業中は 至急 → 納期の早い順', () => {
    expect(rowsForCadTab(units, 'active').map((u) => u.id)).toEqual([
      'working-urgent',
      'waiting-early',
      'waiting-late',
    ])
  })

  it('CSV 登録済は登録が新しい順（至急でも並びは変えない）', () => {
    expect(rowsForCadTab(units, 'csv').map((u) => u.id)).toEqual(['csv-new', 'csv-old'])
  })
})

describe('filterCadUnits', () => {
  const units = [
    unit('a', { intakeNo: '26-1003', customerName: 'A製作所', projectName: 'ポンプ設備工事' }),
    unit('b', { intakeNo: '26-1006', customerName: 'G工業', projectName: null }),
  ]

  it('受付No.・売り先・工事名で絞り込む', () => {
    expect(filterCadUnits(units, '1006').map((u) => u.id)).toEqual(['b'])
    expect(filterCadUnits(units, 'a製作').map((u) => u.id)).toEqual(['a'])
    expect(filterCadUnits(units, 'ポンプ').map((u) => u.id)).toEqual(['a'])
  })

  it('空なら全部', () => {
    expect(filterCadUnits(units, '  ')).toHaveLength(2)
  })
})

describe('cadStatusLabel', () => {
  it('状態の列の文', () => {
    expect(cadStatusLabel('cad_waiting')).toBe('CAD 未着手')
    expect(cadStatusLabel('cad_working')).toBe('CAD 作業中')
    expect(cadStatusLabel('ready')).toBe('CSV 登録済')
  })
})

describe('shortDueDateText / longDueDateText', () => {
  it('日付があれば月日、なければ種別', () => {
    expect(shortDueDateText('確定', '2026-10-03')).toBe('10/03')
    expect(shortDueDateText('後報', null)).toBe('後報')
    expect(shortDueDateText(null, null)).toBe('—')
  })

  it('右のパネルは年月日と曜日、配達', () => {
    expect(longDueDateText('確定', '2026-10-03', '宵積み')).toBe('2026/10/03（土）宵積み')
    expect(longDueDateText('後報', null, '宵積み')).toBe('後報 宵積み')
    expect(longDueDateText('後報', null, null)).toBe('後報')
  })
})
