import { describe, expect, it } from 'vitest'
import { fieldNoteRows } from './field-note-rows'
import { INITIAL_ITEM_ROW } from './item-row'
import { NORMAL_ORDER_CONTEXT } from './resolve-item'
import { ITEM_MASTERS, itemRow } from './test-fixtures'
import { checkRows } from './validate-order-items'

function keyed(key: string, values: Parameters<typeof itemRow>[0]) {
  return { ...itemRow(values), key }
}

describe('fieldNoteRows', () => {
  const rows = [
    keyed('m1', { cutRegion: '41', material: '0', thickness: '12', width: '300', length: '270', quantity: '5' }),
    keyed('p1', { cutRegion: '9', processType: '20', holesPerPiece: '8', holeDiameter: '22' }),
    keyed('blank', {}),
  ]
  const result = fieldNoteRows(
    rows,
    checkRows(rows, ITEM_MASTERS, INITIAL_ITEM_ROW),
    ITEM_MASTERS,
    NORMAL_ORDER_CONTEXT,
  )

  it('材料の行は 切断・区分・材質・寸法・数量 を文にする', () => {
    expect(result[0]).toMatchObject({
      number: '1',
      isProcess: false,
      cutRegion: '41 レーザー寸法切',
      material: 'SS400',
      dimensions: '12 × 300 × 270',
      quantity: '5',
    })
  })

  it('加工の行は 加工方法・加工の項目の文・自動で求めた数量 を出す', () => {
    expect(result[1]).toMatchObject({ number: '└', isProcess: true, dimensions: '1S/ 8孔 22φ', quantity: '40' })
  })

  it('何も入力していない行は出さない', () => {
    expect(result.map((row) => row.key)).toEqual(['m1', 'p1'])
  })
})
