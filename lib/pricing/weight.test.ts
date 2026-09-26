import { describe, expect, it } from 'vitest'
import { calcCircleWeight, calcRectangleWeight, calcTotalWeight } from './weight'

describe('calcRectangleWeight（角の重量）', () => {
  it('普通板は 板厚 × 縦 × 横 × 7.85 ÷ 1,000,000', () => {
    // 9 × 100 × 200 × 7.85 ÷ 1,000,000 = 1.413
    expect(calcRectangleWeight({ thickness: 9, width: 100, length: 200 })).toBeCloseTo(1.413, 10)
  })

  it('縞板は 単位質量 × 縦 × 横 ÷ 1,000,000（板厚は使わない）', () => {
    // 26.82 × 1000 × 2000 ÷ 1,000,000 = 53.64
    expect(
      calcRectangleWeight({ thickness: 3.2, width: 1000, length: 2000, unitWeight: 26.82 }),
    ).toBeCloseTo(53.64, 10)
  })

  it('1枚あたりの重量は丸めずに返す', () => {
    // 6 × 33 × 77 × 7.85 ÷ 1,000,000 = 0.1196811
    expect(calcRectangleWeight({ thickness: 6, width: 33, length: 77 })).toBeCloseTo(0.1196811, 10)
  })
})

describe('calcCircleWeight（円・ドーナツの重量）', () => {
  it('普通板・円は 板厚 × 直径² × 6.161 ÷ 1,000,000', () => {
    // 9 × 100² × 6.161 ÷ 1,000,000 = 0.55449
    expect(calcCircleWeight({ thickness: 9, outerDiameter: 100 })).toBeCloseTo(0.55449, 10)
  })

  it('普通板・ドーナツは外径から内径の分を差し引く', () => {
    // 9 × (200² − 100²) × 6.161 ÷ 1,000,000 = 1.66347
    expect(
      calcCircleWeight({ thickness: 9, outerDiameter: 200, innerDiameter: 100 }),
    ).toBeCloseTo(1.66347, 10)
  })

  it('縞板・円は 単位質量 × 半径² × 3.14 ÷ 1,000,000', () => {
    // 26.82 × 50² × 3.14 ÷ 1,000,000 = 0.210537
    expect(
      calcCircleWeight({ thickness: 3.2, outerDiameter: 100, unitWeight: 26.82 }),
    ).toBeCloseTo(0.210537, 10)
  })

  it('縞板・ドーナツも内径の分を差し引く', () => {
    // 26.82 × (100² − 50²) × 3.14 ÷ 1,000,000 = 0.631611
    expect(
      calcCircleWeight({ thickness: 3.2, outerDiameter: 200, innerDiameter: 100, unitWeight: 26.82 }),
    ).toBeCloseTo(0.631611, 10)
  })
})

describe('calcTotalWeight（合計重量）', () => {
  it('1枚あたり × 枚数 を小数第2位までに四捨五入する', () => {
    // 1.413 × 3 = 4.239 → 4.24
    expect(calcTotalWeight(1.413, 3)).toBe(4.24)
  })

  it('1枚ごとに丸めてから掛けるのではなく、掛けた後に丸める', () => {
    // 0.1196811 × 100 = 11.96811 → 11.97（1枚ごとに 0.12 に丸めると 12.00 になってしまう）
    expect(calcTotalWeight(0.1196811, 100)).toBe(11.97)
  })
})
