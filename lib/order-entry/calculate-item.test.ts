import { describe, expect, it } from 'vitest'
import { MASTERS } from '@/lib/pricing/test-fixtures'
import { calculateItem, pricingConditionsKey, pricingConditionsOf, sumItems } from './calculate-item'
import { resolveItemRow } from './resolve-item'
import { ITEM_MASTERS, itemRow } from './test-fixtures'

const AS_OF = '2026-06-01'

function calculate(values: Parameters<typeof itemRow>[0]) {
  return calculateItem(resolveItemRow(itemRow(values), ITEM_MASTERS), MASTERS, AS_OF)
}

describe('calculateItem', () => {
  it('SN400B・レーザー寸法切・9mm・100×200・10枚: 1 枚 1.413kg → 1.5kg の段で 190 × 1.5 = 285/枚', () => {
    const result = calculate({
      cuttingMethod: '3',
      region: '1',
      material: '4',
      steelMaking: '2',
      thickness: '9',
      width: '100',
      length: '200',
      quantity: '10',
    })
    expect(result).toMatchObject({
      status: 'priced',
      unitPrice: 285,
      priceUnit: '枚',
      amount: 2850,
      totalWeight: 14.13,
    })
  })

  it('定尺に収まる部品には大板加算をかけない（SS400・レーザー・9mm: 170）', () => {
    const result = calculate({
      cuttingMethod: '3',
      region: '1',
      material: '0',
      thickness: '9',
      width: '1000',
      length: '1000',
      quantity: '1',
    })
    expect(result).toMatchObject({ status: 'priced', unitPrice: 170, priceUnit: 'kg' })
  })

  it('定尺を超える部品には大板加算をかける（SS400・レーザー・9mm・2000×2000: 170 + 15 = 185）', () => {
    const result = calculate({
      cuttingMethod: '3',
      region: '1',
      material: '0',
      thickness: '9',
      width: '2000',
      length: '2000',
      quantity: '1',
    })
    expect(result).toMatchObject({ status: 'priced', unitPrice: 185 })
  })

  it('SS400・ガス寸法切・28mm・80×80 は 1 枚 2kg 未満のため別途見積もり', () => {
    const result = calculate({
      cuttingMethod: '2',
      region: '1',
      material: '0',
      thickness: '28',
      width: '80',
      length: '80',
      quantity: '5',
    })
    expect(result).toMatchObject({ status: 'quote', totalWeight: 7.03 })
  })

  it('ベタ丸は角重量で単価を求め、重量の欄は実重量を表示する', () => {
    // 角重量 9 × 300 × 300 × 7.85 ÷ 1,000,000 = 6.3585 → 6.4 × 190 = 1216/枚
    // 実重量 9 × 300² × 6.161 ÷ 1,000,000 = 4.99041 → 10 枚で 49.90
    const result = calculate({
      cuttingMethod: '3',
      region: '7',
      material: '0',
      thickness: '9',
      outerDiameter: '300',
      quantity: '10',
    })
    expect(result).toMatchObject({
      status: 'priced',
      unitPrice: 1216,
      priceUnit: '枚',
      amount: 12160,
      totalWeight: 49.9,
    })
  })

  it('定尺売りは定尺単価 × 合計重量（SS400・6mm・5x10・10 枚）', () => {
    const result = calculate({
      cuttingMethod: '9',
      region: '3',
      material: '0',
      thickness: '6',
      plateSize: '3',
      quantity: '10',
    })
    expect(result).toMatchObject({ status: 'priced', unitPrice: 121, amount: 264733 })
  })

  it('価格マスタの行が未取得なら、重量だけ先に計算する', () => {
    const resolved = resolveItemRow(
      itemRow({ cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '100', length: '200', quantity: '3' }),
      ITEM_MASTERS,
    )
    expect(calculateItem(resolved, undefined, AS_OF)).toMatchObject({
      status: 'loading',
      totalWeight: 4.24,
    })
  })

  it('入力がそろっていなければ計算しない', () => {
    expect(calculate({ cuttingMethod: '3', region: '1', material: '0', thickness: '9' }).status).toBe(
      'incomplete',
    )
  })
})

describe('pricingConditionsOf', () => {
  it('寸法・数量は条件に含めない（同じ材質・板厚の行は同じキーになる）', () => {
    const a = resolveItemRow(
      itemRow({ cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '100', length: '200' }),
      ITEM_MASTERS,
    )
    const b = resolveItemRow(
      itemRow({ cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '900', length: '50' }),
      ITEM_MASTERS,
    )
    expect(pricingConditionsKey(pricingConditionsOf(a, AS_OF)!)).toBe(
      pricingConditionsKey(pricingConditionsOf(b, AS_OF)!),
    )
  })

  it('加工の行は価格マスタの行を取得しない', () => {
    const resolved = resolveItemRow(itemRow({ cuttingMethod: '3', region: '9', thickness: '9' }), ITEM_MASTERS)
    expect(pricingConditionsOf(resolved, AS_OF)).toBeNull()
  })
})

describe('sumItems', () => {
  it('重量は計算できた行、金額は単価が決まった行だけを合計し、別途見積もりの行を数える', () => {
    const totals = sumItems([
      { status: 'priced', weights: dummyWeights, totalWeight: 10.5, unitPrice: 100, priceUnit: 'kg', amount: 1050 },
      { status: 'quote', reason: '', weights: dummyWeights, totalWeight: 7.03 },
      { status: 'incomplete' },
    ])
    expect(totals).toEqual({ totalWeight: 17.53, totalAmount: 1050, quoteCount: 1 })
  })
})

const dummyWeights = { squareWeight: 1, actualWeight: 1, materialWeight: null, displayWeight: 1 }
