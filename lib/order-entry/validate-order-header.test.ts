import { describe, expect, it } from 'vitest'
import { hasErrors, validateOrderHeader, type OrderHeaderInput } from './validate-order-header'

// すべて正しく入力された通常の受注
const VALID: OrderHeaderInput = {
  orderDate: '2026-09-30',
  isSplice: false,
  jointNo: '',
  spliceShot: null,
  customerId: 'customer-1',
  customerContact: '',
  deliveryDestinationId: 'destination-1',
  projectName: '',
  dueDateType: '確定',
  dueDate: '2026-10-05',
  deliveryMethodId: 'delivery-0',
  deliveryMethodNote: '',
}
const NO_NOTE = { deliveryMethodRequiresNote: false }

describe('validateOrderHeader', () => {
  it('必須項目がそろっていればエラーなし（担当者・工事名は任意）', () => {
    const errors = validateOrderHeader(VALID, NO_NOTE)
    expect(errors).toEqual({})
    expect(hasErrors(errors)).toBe(false)
  })

  it('受注日・売り先・入れ先・納期種別・配達が空ならエラー', () => {
    const errors = validateOrderHeader(
      {
        ...VALID,
        orderDate: '',
        customerId: null,
        deliveryDestinationId: null,
        dueDateType: null,
        dueDate: '',
        deliveryMethodId: null,
      },
      NO_NOTE,
    )
    expect(Object.keys(errors).sort()).toEqual(
      ['customerId', 'deliveryDestinationId', 'deliveryMethodId', 'dueDateType', 'orderDate'].sort(),
    )
  })

  it('確定・仮納期は納期の日付が必須', () => {
    expect(validateOrderHeader({ ...VALID, dueDate: '' }, NO_NOTE).dueDate).toBeDefined()
    expect(
      validateOrderHeader({ ...VALID, dueDateType: '仮納期', dueDate: '' }, NO_NOTE).dueDate,
    ).toBeDefined()
  })

  it('後報・最短出荷は納期の日付がなくてよい', () => {
    expect(validateOrderHeader({ ...VALID, dueDateType: '後報', dueDate: '' }, NO_NOTE)).toEqual({})
    expect(
      validateOrderHeader({ ...VALID, dueDateType: '最短出荷', dueDate: '' }, NO_NOTE),
    ).toEqual({})
  })

  it('配達がフリーなら文字が必須', () => {
    const withNote = { deliveryMethodRequiresNote: true }
    expect(validateOrderHeader(VALID, withNote).deliveryMethodNote).toBeDefined()
    expect(
      validateOrderHeader({ ...VALID, deliveryMethodNote: '現場直送' }, withNote),
    ).toEqual({})
  })

  it('スプライス専用の受注は継手番号（4〜6 文字）とショットが必須', () => {
    const splice = { ...VALID, isSplice: true }
    const errors = validateOrderHeader(splice, NO_NOTE)
    expect(errors.jointNo).toBeDefined()
    expect(errors.spliceShot).toBeDefined()

    expect(validateOrderHeader({ ...splice, jointNo: 'GJ1', spliceShot: true }, NO_NOTE).jointNo)
      .toBeDefined()
    expect(
      validateOrderHeader({ ...splice, jointNo: 'GJ10000', spliceShot: true }, NO_NOTE).jointNo,
    ).toBeDefined()
    expect(validateOrderHeader({ ...splice, jointNo: 'GJ10', spliceShot: false }, NO_NOTE))
      .toEqual({})
  })

  it('通常の受注では継手番号・ショットを確認しない', () => {
    expect(validateOrderHeader({ ...VALID, jointNo: '', spliceShot: null }, NO_NOTE)).toEqual({})
  })
})
