import { describe, expect, it } from 'vitest'
import type { CodeOption } from '@/lib/code-input/code-option'
import { SAME_AS_CUSTOMER_OPTION } from './constants'
import {
  destinationOptionsWithIntake,
  intakeHeaderDefaults,
  isFromIntake,
  nextOrderNoText,
  orderDueDateDefault,
  type OrderIntakeSource,
} from './intake-defaults'

const option = (code: string, label: string, value: string): CodeOption<string> => ({ code, label, value })

const MASTERS = {
  customers: [option('1001', 'A製作所', 'c1')],
  destinations: [SAME_AS_CUSTOMER_OPTION, option('2001', '第1工場', 'd1'), option('2002', '第2工場', 'd2')],
  deliveryMethods: [option('0', '宵積み', 'm0'), option('9', 'フリー', 'm9')],
  sites: [option('1', '本社', 's1'), option('2', 'A営業所', 's2')],
}

const source = (overrides: Partial<OrderIntakeSource> = {}): OrderIntakeSource => ({
  intakeId: 'i1',
  workUnitId: 'u1',
  intakeNo: '26-1003',
  kind: 'sakisun',
  origin: 'split',
  isReady: true,
  intakeStaffName: '田中',
  customerId: 'c1',
  customerContact: '佐藤様',
  destinationIds: ['d2', null],
  projectName: '○○ポンプ設備工事',
  dueDateType: '確定',
  dueDate: '2026-10-03',
  deliveryMethodId: 'm9',
  deliveryMethodNote: '午前中',
  siteId: 's2',
  siteCode: 'a',
  isUrgent: true,
  nextBranchNo: 2,
  registeredOrders: [],
  files: [],
  ...overrides,
})

describe('orderDueDateDefault', () => {
  it('日付があれば確定', () => {
    expect(orderDueDateDefault('確定', '2026-10-03')).toEqual({ dueDateType: '確定', dueDate: '2026-10-03' })
  })

  it('日付がなければ後報（受付が後報・未設定）', () => {
    expect(orderDueDateDefault('後報', null)).toEqual({ dueDateType: '後報', dueDate: '' })
    expect(orderDueDateDefault(null, null)).toEqual({ dueDateType: '後報', dueDate: '' })
  })

  it('仮納期・最短出荷は種別をそのまま引き継ぐ', () => {
    expect(orderDueDateDefault('仮納期', '2026-10-10')).toEqual({ dueDateType: '仮納期', dueDate: '2026-10-10' })
    expect(orderDueDateDefault('最短出荷', null)).toEqual({ dueDateType: '最短出荷', dueDate: '' })
  })
})

describe('intakeHeaderDefaults', () => {
  it('受付の値を、打つ番号・文字にする', () => {
    expect(intakeHeaderDefaults(source(), MASTERS)).toEqual({
      customerId: '1001',
      customerContact: '佐藤様',
      deliveryDestinationId: '2002',
      projectName: '○○ポンプ設備工事',
      dueDateType: '1',
      dueDate: '2026-10-03',
      deliveryMethodId: '9',
      deliveryMethodNote: '午前中',
      siteId: '2',
      isUrgent: '1',
    })
  })

  it('入れ先の 1 件目が「売り先と同じ」なら 0、入れ先がなくても 0', () => {
    expect(intakeHeaderDefaults(source({ destinationIds: [null, 'd1'] }), MASTERS).deliveryDestinationId).toBe('0')
    expect(intakeHeaderDefaults(source({ destinationIds: [] }), MASTERS).deliveryDestinationId).toBe('0')
  })

  it('受付で空の欄は空のまま。至急でなければ 0', () => {
    const defaults = intakeHeaderDefaults(
      source({ customerId: null, customerContact: null, projectName: null, isUrgent: false }),
      MASTERS
    )
    expect(defaults.customerId).toBe('')
    expect(defaults.customerContact).toBe('')
    expect(defaults.projectName).toBe('')
    expect(defaults.isUrgent).toBe('0')
  })

  it('日付のない受付の納期は 3 後報', () => {
    const defaults = intakeHeaderDefaults(source({ dueDateType: '後報', dueDate: null }), MASTERS)
    expect(defaults.dueDateType).toBe('3')
    expect(defaults.dueDate).toBe('')
  })
})

describe('destinationOptionsWithIntake', () => {
  it('受付の入れ先を印を付けて先頭に並べ、マスタの並びからは外す', () => {
    const options = destinationOptionsWithIntake(['d2', null], MASTERS.destinations)
    expect(options.map((item) => item.code)).toEqual(['2002', '0', '2001'])
    expect(options[0].label).toBe('受付 1｜第2工場')
    expect(options[1].label).toBe(`受付 2｜${SAME_AS_CUSTOMER_OPTION.label}`)
  })

  it('受付の入れ先がなければマスタのまま', () => {
    expect(destinationOptionsWithIntake([], MASTERS.destinations)).toEqual(MASTERS.destinations)
  })
})

describe('isFromIntake / nextOrderNoText', () => {
  const defaults = intakeHeaderDefaults(source(), MASTERS)

  it('受付の値のままなら true、直したら false', () => {
    expect(isFromIntake('customerId', '1001', defaults)).toBe(true)
    expect(isFromIntake('customerId', '1002', defaults)).toBe(false)
  })

  it('受付から入れない欄・受付で空だった欄・受付がないときは false', () => {
    expect(isFromIntake('orderDate', '2026-10-20', defaults)).toBe(false)
    expect(isFromIntake('customerContact', '', intakeHeaderDefaults(source({ customerContact: null }), MASTERS))).toBe(false)
    expect(isFromIntake('customerId', '1001', null)).toBe(false)
  })

  it('次の受注No. は 受付No.-枝番', () => {
    expect(nextOrderNoText(source())).toBe('26-1003-2')
  })
})
