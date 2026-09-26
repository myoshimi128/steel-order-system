import { describe, expect, it } from 'vitest'
import { applyMinimumWeight } from './minimum-weight'

// 最低保証重量の段の組み合わせ
const LIGHT_TIER = { hasLightTier: true, minWeight: null, alwaysPiecePrice: false }
const STANDARD_TIER = { hasLightTier: false, minWeight: null, alwaysPiecePrice: false }
const SPLICE_RULE = { hasLightTier: false, minWeight: 3, alwaysPiecePrice: false }
const ALWAYS_PIECE = { hasLightTier: true, minWeight: null, alwaysPiecePrice: true }

describe('applyMinimumWeight（1.5kg の段あり）', () => {
  it('SS400ベース 185 の 1.5kg 枚単価は 277.5 を 5円単位で切り捨てて 275', () => {
    expect(applyMinimumWeight(185, 1.2, LIGHT_TIER)).toEqual({
      priceUnit: '枚',
      unitPrice: 275,
      billingWeight: 1.5,
    })
  })

  it('ちょうど 1.5kg は 2kg の段（× 2）', () => {
    expect(applyMinimumWeight(185, 1.5, LIGHT_TIER)).toEqual({
      priceUnit: '枚',
      unitPrice: 370,
      billingWeight: 2,
    })
  })

  it('2kg 以上は kg単価のまま', () => {
    expect(applyMinimumWeight(185, 2, LIGHT_TIER)).toEqual({
      priceUnit: 'kg',
      unitPrice: 185,
      billingWeight: 2,
    })
  })
})

describe('applyMinimumWeight（1.5kg の段なし）', () => {
  it('1.5kg 未満でも 2kg の段（× 2）になる', () => {
    // SM400A 専用単価 178.5 × 2 = 357
    expect(applyMinimumWeight(178.5, 1.2, STANDARD_TIER)).toEqual({
      priceUnit: '枚',
      unitPrice: 357,
      billingWeight: 2,
    })
  })
})

describe('applyMinimumWeight（スプライスの 3kg 保証）', () => {
  it('3kg 未満は × 3', () => {
    expect(applyMinimumWeight(200, 2.5, SPLICE_RULE)).toEqual({
      priceUnit: '枚',
      unitPrice: 600,
      billingWeight: 3,
    })
  })

  it('枚単価の円未満は切り上げる（178.5 × 3 = 535.5 → 536）', () => {
    expect(applyMinimumWeight(178.5, 2.5, SPLICE_RULE)).toEqual({
      priceUnit: '枚',
      unitPrice: 536,
      billingWeight: 3,
    })
  })

  it('1.5kg 未満でも 1.5kg の段ではなく × 3', () => {
    expect(applyMinimumWeight(180, 1, SPLICE_RULE).unitPrice).toBe(540)
  })

  it('3kg 以上は kg単価のまま', () => {
    expect(applyMinimumWeight(180, 3, SPLICE_RULE)).toEqual({
      priceUnit: 'kg',
      unitPrice: 180,
      billingWeight: 3,
    })
  })
})

describe('applyMinimumWeight（ベタ丸・ドーナツ：常に枚単価）', () => {
  it('1.5kg 未満は × 1.5 を 5円単位で切り捨て', () => {
    // 235 × 1.5 = 352.5 → 350
    expect(applyMinimumWeight(235, 1.2, ALWAYS_PIECE).unitPrice).toBe(350)
  })

  it('2kg 以上は重量を小数第1位に丸めて kg単価を掛け、枚単価で返す', () => {
    // 2.34 → 2.3、2.3 × 235 = 540.5 → 円未満切り上げで 541
    expect(applyMinimumWeight(235, 2.34, ALWAYS_PIECE)).toEqual({
      priceUnit: '枚',
      unitPrice: 541,
      billingWeight: 2.3,
    })
  })

  it('重量の丸めは四捨五入', () => {
    // 2.35 → 2.4、2.4 × 200 = 480
    expect(applyMinimumWeight(200, 2.35, ALWAYS_PIECE).unitPrice).toBe(480)
  })
})
