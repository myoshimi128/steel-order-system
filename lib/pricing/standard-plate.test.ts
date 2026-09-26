import { describe, expect, it } from 'vitest'
import { calculateStandardPlatePrice } from './standard-plate'
import { BONDE_PLATE, CHECKERED_PLATE, MASTERS, NORMAL_PLATE, SN400B, SS400 } from './test-fixtures'

const AS_OF = '2026-06-01'

describe('calculateStandardPlatePrice（定尺売り）', () => {
  it('普通板・SS400・6mm・5x10 を 10枚', () => {
    // 1枚: 6 × 1524 × 3048 × 7.85 ÷ 1,000,000 = 218.7866592kg
    // 合計: 2187.866592 → 2187.87kg、金額: 121 × 2187.87 = 264,732.27 → 264,733
    const result = calculateStandardPlatePrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 6,
        plateSize: '5x10',
        quantity: 10,
        asOf: AS_OF,
      },
      MASTERS,
    )
    expect(result).toMatchObject({
      status: 'priced',
      kgUnitPrice: 121,
      totalWeight: 2187.87,
      amount: 264733,
    })
    if (result.status === 'priced') {
      expect(result.pieceWeight).toBeCloseTo(218.7866592, 10)
    }
  })

  it('縞板は単位質量で重量を計算する（3.2mm・4x8 を 5枚）', () => {
    // 1枚: 26.82 × 1219 × 2438 ÷ 1,000,000 = 79.70694804kg
    // 合計: 398.5347402 → 398.53kg、金額: 155 × 398.53 = 61,772.15 → 61,773
    const result = calculateStandardPlatePrice(
      {
        plateType: CHECKERED_PLATE,
        materialId: SS400,
        thickness: 3.2,
        plateSize: '4x8',
        quantity: 5,
        unitWeight: 26.82,
        asOf: AS_OF,
      },
      MASTERS,
    )
    expect(result).toMatchObject({
      status: 'priced',
      kgUnitPrice: 155,
      totalWeight: 398.53,
      amount: 61773,
    })
  })

  it('無規格（ボンデ）は材質 NULL の行を使う（1.6mm・3x6 を 1枚）', () => {
    // 1枚: 1.6 × 914 × 1829 × 7.85 ÷ 1,000,000 = 20.99662736kg → 21.00kg、金額: 170 × 21 = 3570
    const result = calculateStandardPlatePrice(
      {
        plateType: BONDE_PLATE,
        materialId: null,
        thickness: 1.6,
        plateSize: '3x6',
        quantity: 1,
        asOf: AS_OF,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', totalWeight: 21, amount: 3570 })
  })

  it('保証重量は適用しない（1枚が 1.5kg 未満でも実際の重量で計算する）', () => {
    // 実在の定尺は 1枚 2kg 未満にならないため、テスト用に 0.1mm の架空の単価行を用意する
    // 1枚: 0.1 × 914 × 1829 × 7.85 ÷ 1,000,000 = 1.31228921kg → 1.31kg
    // 金額: 170 × 1.31 = 222.7 → 223（保証重量 2kg で計算すると 340 になってしまう）
    const result = calculateStandardPlatePrice(
      {
        plateType: BONDE_PLATE,
        materialId: null,
        thickness: 0.1,
        plateSize: '3x6',
        quantity: 1,
        asOf: AS_OF,
      },
      {
        standardPlatePrices: [
          { plate_type_id: BONDE_PLATE.id, material_id: null, thickness: 0.1, plate_size: '3x6', unit_price: 170, valid_from: '2026-05-21' },
        ],
      },
    )
    expect(result).toMatchObject({ status: 'priced', totalWeight: 1.31, amount: 223 })
  })

  it('定尺単価が登録されていない組み合わせは別途見積もり', () => {
    const result = calculateStandardPlatePrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SN400B,
        thickness: 6,
        plateSize: '5x10',
        quantity: 1,
        asOf: AS_OF,
      },
      MASTERS,
    )
    expect(result.status).toBe('quote')
  })
})
