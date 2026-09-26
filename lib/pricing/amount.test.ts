import { describe, expect, it } from 'vitest'
import { calcAmount } from './amount'

describe('calcAmount（明細金額）', () => {
  it('枚単価は 枚単価 × 枚数', () => {
    expect(calcAmount({ priceUnit: '枚', unitPrice: 536, billingWeight: 3 }, 3)).toBe(1608)
  })

  it('kg単価は kg単価 × 合計重量（小数第2位までに丸めた値）', () => {
    // 合計重量 1.413 × 3 = 4.239 → 4.24、185 × 4.24 = 784.4 → 円未満切り上げで 785
    expect(calcAmount({ priceUnit: 'kg', unitPrice: 185, billingWeight: 1.413 }, 3)).toBe(785)
  })

  it('kg単価に小数がある場合も円未満は切り上げる', () => {
    // 178.5 × 10.00 = 1785（整数ならそのまま）
    expect(calcAmount({ priceUnit: 'kg', unitPrice: 178.5, billingWeight: 5 }, 2)).toBe(1785)
    // 178.5 × 10.01 = 1786.785 → 1787
    expect(calcAmount({ priceUnit: 'kg', unitPrice: 178.5, billingWeight: 5.005 }, 2)).toBe(1787)
  })
})
