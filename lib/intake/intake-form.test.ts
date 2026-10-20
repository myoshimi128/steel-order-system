import { describe, expect, it } from 'vitest'
import { SAME_AS_CUSTOMER_OPTION } from '@/lib/order-entry/constants'
import {
  initialIntakeFormValues,
  validateIntakeForm,
  type IntakeFormMasters,
  type IntakeInfoSource,
} from './intake-form'

const MASTERS: IntakeFormMasters = {
  customers: [{ code: '1001', label: 'サンプル製作所', value: 'c1' }],
  destinations: [
    SAME_AS_CUSTOMER_OPTION,
    { code: '2001', label: '第2工場', value: 'd1' },
    { code: '2002', label: '現場', value: 'd2' },
  ],
  deliveryMethods: [
    { code: '0', label: '宵積み', value: 'm0' },
    { code: '9', label: 'フリー', value: 'm9' },
  ],
  deliveryMethodIdsRequiringNote: ['m9'],
  sites: [
    { code: '1', label: '本社', value: 's1' },
    { code: '2', label: 'A営業所', value: 's2' },
  ],
  staff: [
    { code: 'U00001', label: '山田', value: 'u1' },
    { code: 'U00002', label: '佐藤', value: 'u2' },
  ],
}

const DEFAULTS = { today: '2026-10-19', userId: 'u1', userSiteId: 's2' }

describe('initialIntakeFormValues', () => {
  it('新規は、今日・自分・売り先と同じ・後報・宵積み・自分の営業所・通常', () => {
    const { values, destinationCodes } = initialIntakeFormValues(null, DEFAULTS, MASTERS)
    expect(values).toMatchObject({
      intakeDate: '2026-10-19',
      staffId: 'U00001',
      customerId: '',
      dueDateType: '3',
      deliveryMethodId: '0',
      siteId: '2',
      urgent: '0',
    })
    expect(destinationCodes).toEqual(['0'])
  })

  it('ユーザーの営業所がなければ 1 本社', () => {
    const { values } = initialIntakeFormValues(null, { ...DEFAULTS, userSiteId: null }, MASTERS)
    expect(values.siteId).toBe('1')
  })

  it('保存済みの受付は、その値を番号にして入れる', () => {
    const source: IntakeInfoSource = {
      intakeDate: '2026-10-01',
      staffId: 'u2',
      customerId: 'c1',
      customerContact: '佐藤様',
      projectName: '設備工事',
      dueDateType: '確定',
      dueDate: '2026-10-10',
      deliveryMethodId: 'm9',
      deliveryMethodNote: '午前中',
      siteId: 's1',
      isUrgent: true,
      destinationIds: ['d2', null],
    }
    const { values, destinationCodes } = initialIntakeFormValues(source, DEFAULTS, MASTERS)
    expect(values).toEqual({
      intakeDate: '2026-10-01',
      staffId: 'U00002',
      customerId: '1001',
      customerContact: '佐藤様',
      projectName: '設備工事',
      dueDateType: '1',
      dueDate: '2026-10-10',
      deliveryMethodId: '9',
      deliveryMethodNote: '午前中',
      siteId: '1',
      urgent: '1',
    })
    expect(destinationCodes).toEqual(['2002', '0'])
  })
})

describe('validateIntakeForm', () => {
  const base = () => initialIntakeFormValues(null, DEFAULTS, MASTERS)

  it('売り先を入れれば保存できる。入れ先の 0 は null になる', () => {
    const { values, destinationCodes } = base()
    const result = validateIntakeForm({ ...values, customerId: '1001' }, destinationCodes, MASTERS)
    expect(result.errors).toEqual({})
    expect(result.payload).toMatchObject({
      customerId: 'c1',
      staffId: 'u1',
      siteId: 's2',
      dueDateType: '後報',
      dueDate: null,
      deliveryMethodNote: null,
      isUrgent: false,
      destinationIds: [null],
    })
  })

  it('売り先が空ならエラー', () => {
    const { values, destinationCodes } = base()
    const result = validateIntakeForm(values, destinationCodes, MASTERS)
    expect(result.payload).toBeNull()
    expect(result.errors.customerId).toBe('売り先を入力してください')
  })

  it('存在しない番号はエラー', () => {
    const { values, destinationCodes } = base()
    const result = validateIntakeForm({ ...values, customerId: '9999', urgent: '2' }, destinationCodes, MASTERS)
    expect(result.errors.customerId).toBe('存在しない番号です')
    expect(result.errors.urgent).toBe('存在しない番号です')
  })

  it('同じ入れ先が 2 行あれば、後の行をエラーにする', () => {
    const { values } = base()
    const result = validateIntakeForm({ ...values, customerId: '1001' }, ['2001', '0', '2001'], MASTERS)
    expect(result.errors).toEqual({ 'destination-2': '同じ入れ先がすでにあります' })
  })

  it('確定・仮納期は日付が必要。至急 1 は true', () => {
    const { values, destinationCodes } = base()
    const missing = validateIntakeForm(
      { ...values, customerId: '1001', dueDateType: '1' },
      destinationCodes,
      MASTERS
    )
    expect(missing.errors.dueDate).toBe('納期の日付を入力してください')

    const ok = validateIntakeForm(
      { ...values, customerId: '1001', dueDateType: '1', dueDate: '2026-10-30', urgent: '1' },
      destinationCodes,
      MASTERS
    )
    expect(ok.payload).toMatchObject({ dueDateType: '確定', dueDate: '2026-10-30', isUrgent: true })
  })

  it('配達がフリーなら文字が必要', () => {
    const { values, destinationCodes } = base()
    const result = validateIntakeForm(
      { ...values, customerId: '1001', deliveryMethodId: '9' },
      destinationCodes,
      MASTERS
    )
    expect(result.errors.deliveryMethodNote).toBe('配達の内容を入力してください')
  })
})
