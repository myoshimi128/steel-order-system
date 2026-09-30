import { describe, expect, it } from 'vitest'
import { MASTERS } from '@/lib/pricing/test-fixtures'
import { buildOrderItemPayload } from './build-order-payload'
import { calculateItem } from './calculate-item'
import { buildProductName } from './product-name'
import { resolveItemRow } from './resolve-item'
import { ITEM_MASTERS, itemRow } from './test-fixtures'

const AS_OF = '2026-06-01'

function payloadOf(values: Parameters<typeof itemRow>[0]) {
  const resolved = resolveItemRow(itemRow(values), ITEM_MASTERS)
  return buildOrderItemPayload(resolved, calculateItem(resolved, MASTERS, AS_OF), 1, values.fieldNote ?? '')
}

describe('buildOrderItemPayload', () => {
  it('寸法切は切断方法・切断区分・縦横を保存し、実重量は角重量と同じ', () => {
    expect(
      payloadOf({
        cuttingMethod: '3',
        region: '1',
        material: '0',
        thickness: '9',
        width: '100',
        length: '200',
        quantity: '10',
        fieldNote: ' 端材は返却 ',
      }),
    ).toMatchObject({
      product_id: 'p-ss400-9-std',
      cutting_method: 'レーザー',
      cutting_type: '寸法切',
      special_product_type_id: null,
      steel_making: '電炉材',
      width: 100,
      length: 200,
      outer_diameter: null,
      square_weight: 1.413,
      actual_weight: 1.413,
      cutting_unit_price: 255,
      price_unit: '枚',
      field_note: '端材は返却',
    })
  })

  it('定尺売りは切断方法 NULL・定尺サイズを保存する', () => {
    expect(
      payloadOf({ cuttingMethod: '9', region: '3', material: '0', thickness: '6', plateSize: '3', quantity: '1' }),
    ).toMatchObject({
      cutting_method: null,
      cutting_type: null,
      plate_size: '5x10',
      // 定尺売りは製鋼法を入力しない
      steel_making: null,
      cutting_unit_price: 121,
      price_unit: 'kg',
    })
  })

  it('ベタ丸は特殊製品種別と外径を保存し、切断区分は NULL', () => {
    expect(
      payloadOf({ cuttingMethod: '3', region: '7', material: '0', thickness: '9', outerDiameter: '300', quantity: '10' }),
    ).toMatchObject({
      cutting_type: null,
      special_product_type_id: 'sp-betamaru',
      outer_diameter: 300,
      width: null,
      price_unit: '枚',
    })
  })

  it('別途見積もりは仕入単価を NULL で保存する', () => {
    expect(
      payloadOf({ cuttingMethod: '2', region: '1', material: '0', thickness: '28', width: '80', length: '80', quantity: '5' }),
    ).toMatchObject({ cutting_unit_price: null, price_unit: null, product_id: 'p-ss400-28-large' })
  })

  it('入力がそろっていない行は保存用のデータを作らない', () => {
    expect(payloadOf({ cuttingMethod: '3', region: '1' })).toBeNull()
  })
})

describe('buildProductName', () => {
  it('普通板は種類を省き、材質と製鋼法を並べる', () => {
    const resolved = resolveItemRow(itemRow({ material: '4', steelMaking: '2' }), ITEM_MASTERS)
    expect(buildProductName(resolved, ITEM_MASTERS)).toBe('SN400B 高炉')
  })

  it('縞板は種類・材質・メーカーを並べ、製鋼法は出さない', () => {
    const resolved = resolveItemRow(itemRow({ plateType: '1', material: '0', manufacturer: '1' }), ITEM_MASTERS)
    expect(buildProductName(resolved, ITEM_MASTERS)).toBe('縞板 SS400 メーカーA')
  })
})
