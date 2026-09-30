import { describe, expect, it } from 'vitest'
import { INITIAL_ITEM_ROW } from './item-row'
import { ITEM_MASTERS, itemRow } from './test-fixtures'
import { checkItemRow, hasItemErrors, validateOrderItems } from './validate-order-items'

// すべて正しく入力された行（SS400・レーザー寸法切・9mm）
const VALID = { cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '100', length: '200', quantity: '10' }

describe('checkItemRow', () => {
  it('正しく入力された行はエラーなし', () => {
    expect(checkItemRow(itemRow(VALID), ITEM_MASTERS).errors).toEqual({})
  })

  it('取り扱いのない板厚は、入力中から警告する', () => {
    const { liveErrors } = checkItemRow(itemRow({ ...VALID, thickness: '14' }), ITEM_MASTERS)
    expect(liveErrors.thickness).toContain('14mm は取り扱いがありません')
  })

  it('定尺を超える部品で大板の取り扱いがなければ警告する（SN400B 9mm は定尺のみ）', () => {
    const { liveErrors } = checkItemRow(
      itemRow({ ...VALID, material: '4', width: '2000', length: '2000' }),
      ITEM_MASTERS,
    )
    expect(liveErrors.thickness).toContain('大板')
  })

  it('縞板はメーカーが必須', () => {
    const { errors } = checkItemRow(
      itemRow({ ...VALID, plateType: '1', thickness: '3.2', manufacturer: '0' }),
      ITEM_MASTERS,
    )
    expect(errors.manufacturer).toBeDefined()
  })

  it('縞板で、選んだメーカーにその板厚の単位質量がなければ警告する', () => {
    const { liveErrors } = checkItemRow(
      itemRow({ ...VALID, plateType: '1', thickness: '3.2', manufacturer: '2' }),
      ITEM_MASTERS,
    )
    expect(liveErrors.manufacturer).toContain('3.2mm の単位質量が登録されていません')
  })

  it('縞板は製鋼法を確認しない（「—」で入力しない）', () => {
    const { errors } = checkItemRow(
      itemRow({ ...VALID, plateType: '1', thickness: '3.2', manufacturer: '1', steelMaking: '' }),
      ITEM_MASTERS,
    )
    expect(errors.steelMaking).toBeUndefined()
  })

  it('区分によって必要な寸法の欄が変わる', () => {
    const circle = checkItemRow(
      itemRow({ ...VALID, region: '7', width: '', length: '', outerDiameter: '' }),
      ITEM_MASTERS,
    ).errors
    expect(circle.outerDiameter).toBeDefined()
    expect(circle.width).toBeUndefined()

    const standard = checkItemRow(
      itemRow({ ...VALID, cuttingMethod: '9', region: '3', width: '', length: '', plateSize: '' }),
      ITEM_MASTERS,
    ).errors
    expect(standard.plateSize).toBeDefined()
  })

  it('区分 9 加工は、次の作業で対応する旨を表示する', () => {
    expect(checkItemRow(itemRow({ ...VALID, region: '9' }), ITEM_MASTERS).liveErrors.region).toContain(
      '次の作業',
    )
  })

  it('切断方法が定尺なのに区分が定尺でない行はエラー', () => {
    expect(checkItemRow(itemRow({ ...VALID, cuttingMethod: '9' }), ITEM_MASTERS).errors.region).toBeDefined()
  })

  it('存在しない番号はエラー', () => {
    const { errors } = checkItemRow(itemRow({ ...VALID, cuttingMethod: '5', material: '99' }), ITEM_MASTERS)
    expect(errors.cuttingMethod).toBe('存在しない番号です')
    expect(errors.material).toBe('存在しない番号です')
  })
})

describe('validateOrderItems', () => {
  it('何も入力していない行は確認・保存の対象から外す', () => {
    const result = validateOrderItems(
      [itemRow({ ...VALID, key: 'a' } as never), { ...itemRow({}), key: 'b' }],
      ITEM_MASTERS,
      INITIAL_ITEM_ROW,
    )
    expect(result.targetRows).toHaveLength(1)
    expect(hasItemErrors(result)).toBe(false)
  })

  it('明細が 1 行もなければエラー', () => {
    const result = validateOrderItems([itemRow({})], ITEM_MASTERS, INITIAL_ITEM_ROW)
    expect(result.itemsError).toBeDefined()
    expect(hasItemErrors(result)).toBe(true)
  })

  it('エラーのある行は、行の key ごとにエラーを返す', () => {
    const result = validateOrderItems(
      [{ ...itemRow({ ...VALID, quantity: '' }), key: 'row-x' }],
      ITEM_MASTERS,
      INITIAL_ITEM_ROW,
    )
    expect(result.rowErrors['row-x']?.quantity).toBeDefined()
  })
})
