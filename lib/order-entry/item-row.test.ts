import { describe, expect, it } from 'vitest'
import { applyItemFieldChange, copyItemRow, itemFieldOrder } from './item-row'
import { ITEM_MASTERS, itemRow } from './test-fixtures'

describe('applyItemFieldChange', () => {
  it('切断方法を 9 定尺にすると、区分も 3 定尺に固定する', () => {
    const next = applyItemFieldChange(itemRow({ region: '1' }), 'cuttingMethod', '9', ITEM_MASTERS)
    expect(next.region).toBe('3')
  })

  it('切断方法を定尺から戻すと、固定していた区分を空にする', () => {
    const next = applyItemFieldChange(
      itemRow({ cuttingMethod: '9', region: '3' }),
      'cuttingMethod',
      '2',
      ITEM_MASTERS,
    )
    expect(next.region).toBe('')
  })

  it('種類を縞板にすると、メーカーの「0 指定なし」を空にする（縞板はメーカー必須）', () => {
    const next = applyItemFieldChange(itemRow({ manufacturer: '0' }), 'plateType', '1', ITEM_MASTERS)
    expect(next.manufacturer).toBe('')
  })

  it('縞板から普通板に戻すと、メーカーの初期値「0 指定なし」を入れる', () => {
    const next = applyItemFieldChange(
      itemRow({ plateType: '1', manufacturer: '' }),
      'plateType',
      '0',
      ITEM_MASTERS,
    )
    expect(next.manufacturer).toBe('0')
  })

  it('新しい種類で選べない材質は空にする（ボンデは材質なし）', () => {
    const next = applyItemFieldChange(itemRow({ material: '0' }), 'plateType', '2', ITEM_MASTERS)
    expect(next.material).toBe('')
  })

  it('材質のない種類から普通板に戻すと、材質の初期値「0 SS400」と SS400 の製鋼法（電炉）を入れる', () => {
    const next = applyItemFieldChange(
      itemRow({ plateType: '2', material: '', steelMaking: '2' }),
      'plateType',
      '0',
      ITEM_MASTERS,
    )
    expect(next.material).toBe('0')
    expect(next.steelMaking).toBe('1')
  })

  it('材質を入力すると、製鋼法をその材質の初期値にする（SN400B は高炉）', () => {
    const next = applyItemFieldChange(itemRow({ material: '0', steelMaking: '1' }), 'material', '4', ITEM_MASTERS)
    expect(next.steelMaking).toBe('2')
  })

  it('材質を SS400 に戻すと、製鋼法も電炉に戻す', () => {
    const next = applyItemFieldChange(itemRow({ material: '4', steelMaking: '2' }), 'material', '0', ITEM_MASTERS)
    expect(next.steelMaking).toBe('1')
  })

  it('材質を変えなければ、手で変えた製鋼法はそのまま（SS400 を高炉にした場合）', () => {
    const changed = applyItemFieldChange(itemRow({ material: '0' }), 'steelMaking', '2', ITEM_MASTERS)
    const next = applyItemFieldChange(changed, 'thickness', '9', ITEM_MASTERS)
    expect(next.steelMaking).toBe('2')
  })

  it('存在しない材質の番号では、製鋼法を変えない', () => {
    const next = applyItemFieldChange(itemRow({ material: '0', steelMaking: '1' }), 'material', '99', ITEM_MASTERS)
    expect(next.steelMaking).toBe('1')
  })
})

describe('createEmptyItemRow の初期値', () => {
  it('種類 0 普通板・材質 0 SS400・製鋼法 1 電炉・メーカー 0 指定なし', () => {
    const row = itemRow({})
    expect([row.plateType, row.material, row.steelMaking, row.manufacturer]).toEqual(['0', '0', '1', '0'])
  })
})

describe('copyItemRow', () => {
  it('直前の行の入力値（数量・摘要も含む）を写し、行の ID は今の行のまま', () => {
    const source = itemRow({ key: 'prev', cuttingMethod: '2', quantity: '5', fieldNote: '急ぎ' } as never)
    expect(copyItemRow(source, 'current')).toEqual({ ...source, key: 'current' })
  })
})

describe('itemFieldOrder', () => {
  const flags = { needsMaterial: true, steelMakingApplicable: true }

  it('寸法切は 板厚 → 縦 → 横 → 数量 の順', () => {
    expect(itemFieldOrder(itemRow({ region: '1' }), flags, ITEM_MASTERS)).toEqual([
      'row-1:cuttingMethod',
      'row-1:region',
      'row-1:plateType',
      'row-1:material',
      'row-1:steelMaking',
      'row-1:manufacturer',
      'row-1:thickness',
      'row-1:width',
      'row-1:length',
      'row-1:quantity',
    ])
  })

  it('定尺は区分（固定）と製鋼法（—）を飛ばし、板厚の後に定尺サイズを入力する', () => {
    expect(
      itemFieldOrder(
        itemRow({ cuttingMethod: '9', region: '3' }),
        { needsMaterial: true, steelMakingApplicable: false },
        ITEM_MASTERS,
      ),
    ).toEqual([
      'row-1:cuttingMethod',
      'row-1:plateType',
      'row-1:material',
      'row-1:manufacturer',
      'row-1:thickness',
      'row-1:plateSize',
      'row-1:quantity',
    ])
  })

  it('ベタ丸は板厚の後に直径だけを入力する', () => {
    const order = itemFieldOrder(itemRow({ region: '7' }), flags, ITEM_MASTERS)
    expect(order.slice(-3)).toEqual(['row-1:thickness', 'row-1:outerDiameter', 'row-1:quantity'])
  })
})
