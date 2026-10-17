import { describe, expect, it } from 'vitest'
import { rowEmphasis } from './emphasis'
import { resolveItemRow } from './resolve-item'
import { ITEM_MASTERS, itemRow } from './test-fixtures'

function emphasisOf(values: Parameters<typeof itemRow>[0]) {
  return rowEmphasis(resolveItemRow(itemRow({ cutRegion: '41', ...values }), ITEM_MASTERS), ITEM_MASTERS)
}

describe('rowEmphasis', () => {
  it('いつもの値（普通板・SS400・電炉・指定なし）なら、どこも強調しない', () => {
    expect(emphasisOf({})).toEqual({
      plateType: false,
      material: false,
      steelMaking: false,
      manufacturer: false,
    })
  })

  it('SS400 を高炉にすると、製鋼法を強調する', () => {
    expect(emphasisOf({ steelMaking: '2' }).steelMaking).toBe(true)
  })

  it('SN400B（初期値が高炉）を高炉のままにしたときは、材質だけを強調する', () => {
    expect(emphasisOf({ material: '4', steelMaking: '2' })).toMatchObject({ material: true, steelMaking: false })
  })

  it('SN400B を電炉にすると、製鋼法も強調する', () => {
    expect(emphasisOf({ material: '4', steelMaking: '1' }).steelMaking).toBe(true)
  })

  it('縞板とメーカーの指定を強調する', () => {
    expect(emphasisOf({ plateType: '1', manufacturer: '1' })).toMatchObject({
      plateType: true,
      manufacturer: true,
    })
  })
})
