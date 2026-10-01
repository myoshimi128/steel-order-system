import { describe, expect, it } from 'vitest'
import { buildOrderPayload } from './build-order-payload'
import { SAME_AS_CUSTOMER_DESTINATION } from './constants'
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

  it('スプライス専用の受注はショットが必須。継手番号は任意', () => {
    const splice = { ...VALID, isSplice: true }
    const errors = validateOrderHeader(splice, NO_NOTE)
    expect(errors.spliceShot).toBeDefined()
    expect(errors.jointNo).toBeUndefined()

    // 継手番号は空欄のまま登録できる
    expect(validateOrderHeader({ ...splice, jointNo: '', spliceShot: true }, NO_NOTE)).toEqual({})
  })

  it('継手番号は 10 文字以内（下限はない）', () => {
    const splice = { ...VALID, isSplice: true, spliceShot: true }
    expect(validateOrderHeader({ ...splice, jointNo: 'G' }, NO_NOTE)).toEqual({})
    expect(validateOrderHeader({ ...splice, jointNo: 'AB12345678' }, NO_NOTE)).toEqual({})
    expect(validateOrderHeader({ ...splice, jointNo: 'AB123456789' }, NO_NOTE).jointNo).toBe(
      '継手番号は 10 文字以内で入力してください',
    )
  })

  it('入れ先は「売り先と同じ」でもよい', () => {
    expect(
      validateOrderHeader({ ...VALID, deliveryDestinationId: SAME_AS_CUSTOMER_DESTINATION }, NO_NOTE),
    ).toEqual({})
  })

  it('通常の受注では継手番号・ショットを確認しない', () => {
    expect(validateOrderHeader({ ...VALID, jointNo: '', spliceShot: null }, NO_NOTE)).toEqual({})
  })
})

describe('buildOrderPayload', () => {
  it('入れ先が「売り先と同じ」なら delivery_destination_id は NULL', () => {
    expect(
      buildOrderPayload({ ...VALID, deliveryDestinationId: SAME_AS_CUSTOMER_DESTINATION }, false)
        .delivery_destination_id,
    ).toBeNull()
    expect(buildOrderPayload(VALID, false).delivery_destination_id).toBe('destination-1')
  })

  it('スプライス専用の受注で継手番号が空欄なら NULL、入力があれば前後の空白を除いて保存する', () => {
    const splice = { ...VALID, isSplice: true, spliceShot: true }
    expect(buildOrderPayload({ ...splice, jointNo: '  ' }, false)).toMatchObject({
      joint_no: null,
      splice_shot: true,
    })
    expect(buildOrderPayload({ ...splice, jointNo: ' AB1234 ' }, false).joint_no).toBe('AB1234')
  })

  it('通常の受注では継手番号・ショットを保存しない', () => {
    expect(buildOrderPayload({ ...VALID, jointNo: 'AB1234' }, false)).toMatchObject({
      joint_no: null,
      splice_shot: null,
    })
  })
})
