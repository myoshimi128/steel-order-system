import { describe, expect, it } from 'vitest'
import { MASTERS } from '@/lib/pricing/test-fixtures'
import { calculateItem } from './calculate-item'
import { calculateProcess, parentBillingTotalWeight, resolveProcessRow } from './process-row'
import { resolveItemRow } from './resolve-item'
import { ITEM_MASTERS, itemRow } from './test-fixtures'

const AS_OF = '2026-06-01'

function process(values: Parameters<typeof itemRow>[0]) {
  return resolveProcessRow(itemRow({ region: '9', ...values }), ITEM_MASTERS)
}

describe('resolveProcessRow', () => {
  it('加工方法の番号から加工種別を引く。番号が未設定の加工種別は選べない', () => {
    expect(process({ processType: '11' }).processTypeId).toBe('proc-kiri')
    expect(process({ processType: '' }).processTypeId).toBeNull()
  })

  it('単位の初期値は 1 個', () => {
    expect(process({}).priceUnit).toBe('個')
  })
})

describe('calculateProcess（加工の仕入金額）', () => {
  it('単位が個なら 単価 × 数量（円未満切り上げ）', () => {
    expect(calculateProcess(process({ quantity: '48', unitPrice: '12.5' }), null)).toEqual({
      status: 'priced',
      amount: 600,
    })
    expect(calculateProcess(process({ quantity: '3', unitPrice: '10.1' }), null)).toEqual({
      status: 'priced',
      amount: 31,
    })
  })

  it('単位が kg なら 単価 × 母材の合計重量（円未満切り上げ）', () => {
    // 14.13kg × 30 = 423.9 → 424
    expect(
      calculateProcess(process({ quantity: '10', priceUnit: '2', unitPrice: '30' }), 14.13),
    ).toEqual({ status: 'priced', amount: 424 })
  })

  it('kg 単位で母材の重量がまだ求まらなければ、仕入金額を出さない', () => {
    expect(calculateProcess(process({ quantity: '1', priceUnit: '2', unitPrice: '30' }), null)).toEqual({
      status: 'incomplete',
    })
  })

  it('仕入単価が空欄なら単価未定', () => {
    expect(calculateProcess(process({ quantity: '1', unitPrice: '' }), null)).toEqual({
      status: 'unpriced',
    })
  })
})

describe('parentBillingTotalWeight（母材の単価の根拠にした重量の合計）', () => {
  it('角重量 × 母材の数量（ベタ丸でも表示用の実重量ではなく角重量）', () => {
    // ベタ丸 9mm 直径 300: 角重量 6.3585kg × 10 枚 = 63.585 → 63.59（実重量の 49.90 ではない）
    const parent = resolveItemRow(
      itemRow({ cuttingMethod: '3', region: '7', material: '0', thickness: '9', outerDiameter: '300', quantity: '10' }),
      ITEM_MASTERS,
    )
    expect(parentBillingTotalWeight(calculateItem(parent, MASTERS, AS_OF), parent.quantity)).toBe(63.59)
  })

  it('母材の重量が求まっていなければ null', () => {
    const parent = resolveItemRow(itemRow({ cuttingMethod: '3', region: '1' }), ITEM_MASTERS)
    expect(parentBillingTotalWeight(calculateItem(parent, MASTERS, AS_OF), parent.quantity)).toBeNull()
  })
})
