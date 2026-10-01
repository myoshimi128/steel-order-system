import { describe, expect, it } from 'vitest'
import { INITIAL_ITEM_ROW } from './item-row'
import { ITEM_MASTERS, itemRow } from './test-fixtures'
import { checkItemRow, checkRows, hasItemErrors, validateOrderItems } from './validate-order-items'

// すべて正しく入力された行（SS400・レーザー寸法切・9mm）
const VALID = { cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '100', length: '200', quantity: '10' }

// すべて正しく入力された加工の行（キリ孔・48 個・単価 30）
const PROCESS = { region: '9', processType: '11', spec: '1S / 12孔 38φ', quantity: '48', priceUnit: '1', unitPrice: '30' }

// スプライス専用の受注（ショット有）
const SPLICE_CONTEXT = { isSplice: true, spliceShot: true }

// 行の ID を指定して行を作る
function keyed(key: string, values: Parameters<typeof itemRow>[0]) {
  return { ...itemRow(values), key }
}

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

  it('スプライス専用の受注では、通常の受注の区分（ベタ丸など）の行はエラー', () => {
    const { liveErrors } = checkItemRow(itemRow({ ...VALID, region: '7' }), ITEM_MASTERS, SPLICE_CONTEXT)
    expect(liveErrors.region).toContain('スプライス専用の受注では使えない区分')
  })

  it('スプライス専用の受注で 1 寸法切 / 2 アイトレ の行は、スプライスとして確認する', () => {
    expect(checkItemRow(itemRow(VALID), ITEM_MASTERS, SPLICE_CONTEXT).errors).toEqual({})
    expect(checkItemRow(itemRow({ ...VALID, region: '2' }), ITEM_MASTERS, SPLICE_CONTEXT).errors).toEqual({})
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

describe('checkRows（加工の行）', () => {
  it('材料の行の下の加工の行は、エラーなし（仕入単価は空欄でもよい）', () => {
    const checks = checkRows(
      [keyed('m1', VALID), keyed('p1', PROCESS), keyed('p2', { ...PROCESS, unitPrice: '' })],
      ITEM_MASTERS,
      INITIAL_ITEM_ROW,
    )
    expect(checks.map((check) => check.kind)).toEqual(['material', 'process', 'process'])
    expect(checks[1].errors).toEqual({})
    expect(checks[2].errors).toEqual({})
  })

  it('材料の行より前（先頭）の加工の行はエラー', () => {
    const checks = checkRows([keyed('p1', PROCESS), keyed('m1', VALID)], ITEM_MASTERS, INITIAL_ITEM_ROW)
    expect(checks[0].liveErrors.region).toContain('材料の行の下')
  })

  it('何も入力していない材料の行の下の加工の行も、母材がないためエラー', () => {
    const checks = checkRows([keyed('blank', {}), keyed('p1', PROCESS)], ITEM_MASTERS, INITIAL_ITEM_ROW)
    expect(checks[1].liveErrors.region).toBeDefined()
  })

  it('加工方法・数量は必須。番号が未設定の加工種別は選べない', () => {
    const checks = checkRows(
      [keyed('m1', VALID), keyed('p1', { ...PROCESS, processType: '', quantity: '' })],
      ITEM_MASTERS,
      INITIAL_ITEM_ROW,
    )
    expect(checks[1].errors.processType).toBeDefined()
    expect(checks[1].errors.quantity).toBeDefined()
  })

  it('仕入単価が数値でなければエラー', () => {
    const checks = checkRows(
      [keyed('m1', VALID), keyed('p1', { ...PROCESS, unitPrice: '3..0' })],
      ITEM_MASTERS,
      INITIAL_ITEM_ROW,
    )
    expect(checks[1].liveErrors.unitPrice).toBeDefined()
  })
})

describe('validateOrderItems', () => {
  it('加工の行だけの受注は登録できない', () => {
    const result = validateOrderItems([keyed('p1', PROCESS)], ITEM_MASTERS, INITIAL_ITEM_ROW)
    expect(result.itemsError).toBeDefined()
  })

  it('加工の行も保存の対象に含める', () => {
    const result = validateOrderItems(
      [keyed('m1', VALID), keyed('p1', PROCESS)],
      ITEM_MASTERS,
      INITIAL_ITEM_ROW,
    )
    expect(result.targetRows.map((row) => row.key)).toEqual(['m1', 'p1'])
    expect(hasItemErrors(result)).toBe(false)
  })

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
