import { describe, expect, it } from 'vitest'
import { MASTERS } from '@/lib/pricing/test-fixtures'
import { calculateItem, pricingConditionsKey, pricingConditionsOf } from './calculate-item'
import { sumRows } from './item-totals'
import { resolveItemRow } from './resolve-item'
import { ITEM_MASTERS, itemRow } from './test-fixtures'

const AS_OF = '2026-06-01'

function calculate(values: Parameters<typeof itemRow>[0]) {
  return calculateItem(resolveItemRow(itemRow(values), ITEM_MASTERS), MASTERS, AS_OF)
}

// スプライス専用の受注の行を計算する（spliceShot はヘッダーのショット有無）
function calculateSplice(values: Parameters<typeof itemRow>[0], spliceShot: boolean | null) {
  return calculateItem(
    resolveItemRow(itemRow(values), ITEM_MASTERS, { isSplice: true, spliceShot }),
    MASTERS,
    AS_OF,
  )
}

describe('calculateItem（スプライス専用の受注）', () => {
  const SPLICE_ROW = {
    cuttingMethod: '2',
    region: '1',
    material: '0',
    thickness: '16',
    width: '150',
    length: '400',
    quantity: '20',
  }

  it('ショット有の単価で計算する（SS400・16mm・150×400・20 枚: 190/kg、150.72kg）', () => {
    expect(calculateSplice(SPLICE_ROW, true)).toMatchObject({
      weight: { totalWeight: 150.72 },
      price: { status: 'priced', unitPrice: 190, priceUnit: 'kg', amount: 28637 },
    })
  })

  it('ショット無なら ショット無の単価（180/kg）', () => {
    expect(calculateSplice(SPLICE_ROW, false).price).toMatchObject({ status: 'priced', unitPrice: 180 })
  })

  it('切断区分 1 寸法切は、実重量に角重量と同じ値を入れる', () => {
    expect(calculateSplice(SPLICE_ROW, true).weight?.weights).toEqual({
      squareWeight: 7.536,
      actualWeight: 7.536,
      materialWeight: null,
      displayWeight: 7.536,
    })
  })

  it('切断区分 2 アイトレは別途見積もり。重量（角重量）は寸法から計算する', () => {
    expect(calculateSplice({ ...SPLICE_ROW, region: '2' }, true)).toEqual({
      // アイトレの実重量は送り状発行の画面で入力するため null
      weight: {
        weights: { squareWeight: 7.536, actualWeight: null, materialWeight: null, displayWeight: 7.536 },
        totalWeight: 150.72,
      },
      price: { status: 'quote', reason: 'アイトレのため別途見積もり' },
    })
  })

  it('ヘッダーのショットが未選択なら単価は未確定。重量は計算する', () => {
    expect(calculateSplice(SPLICE_ROW, null)).toMatchObject({
      weight: { totalWeight: 150.72 },
      price: { status: 'undetermined', reason: 'ショットが未入力のため単価を計算できません' },
    })
  })

  it('3kg 未満は 3kg 保証の枚単価（9mm・100×200: 190 × 3 = 570/枚）', () => {
    expect(
      calculateSplice({ ...SPLICE_ROW, thickness: '9', width: '100', length: '200', quantity: '30' }, true)
        .price,
    ).toMatchObject({ status: 'priced', unitPrice: 570, priceUnit: '枚', amount: 17100 })
  })
})

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
      weight: { totalWeight: 14.13 },
      price: { status: 'priced', unitPrice: 285, priceUnit: '枚', amount: 2850 },
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
    expect(result.price).toMatchObject({ status: 'priced', unitPrice: 170, priceUnit: 'kg' })
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
    expect(result.price).toMatchObject({ status: 'priced', unitPrice: 185 })
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
    expect(result).toMatchObject({ weight: { totalWeight: 7.03 }, price: { status: 'quote' } })
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
      weight: { totalWeight: 49.9 },
      price: { status: 'priced', unitPrice: 1216, priceUnit: '枚', amount: 12160 },
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
    expect(result.price).toMatchObject({ status: 'priced', unitPrice: 121, amount: 264733 })
  })

  it('価格マスタの行が未取得（取得中・取得失敗）なら、重量だけ先に計算する', () => {
    const resolved = resolveItemRow(
      itemRow({ cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '100', length: '200', quantity: '3' }),
      ITEM_MASTERS,
    )
    expect(calculateItem(resolved, undefined, AS_OF)).toMatchObject({
      weight: { totalWeight: 4.24 },
      price: { status: 'loading' },
    })
  })

  it('受注日が未入力なら単価は未確定。重量は計算する', () => {
    const resolved = resolveItemRow(
      itemRow({ cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '100', length: '200', quantity: '3' }),
      ITEM_MASTERS,
    )
    expect(calculateItem(resolved, MASTERS, '')).toMatchObject({
      weight: { totalWeight: 4.24 },
      price: { status: 'undetermined', reason: '受注日が未入力のため単価を計算できません' },
    })
  })

  it('切断方法が未入力なら単価は未確定。重量は計算する', () => {
    expect(
      calculate({ region: '1', material: '0', thickness: '9', width: '100', length: '200', quantity: '3' }),
    ).toMatchObject({
      weight: { totalWeight: 4.24 },
      price: { status: 'undetermined', reason: '切断方法が未入力のため単価を計算できません' },
    })
  })

  it('取り扱いのない板厚（商品がない）なら単価は未確定。重量は計算する', () => {
    // 12 × 100 × 200 × 7.85 ÷ 1,000,000 = 1.884kg
    expect(
      calculate({ cuttingMethod: '3', region: '1', material: '0', thickness: '12', width: '100', length: '200', quantity: '1' }),
    ).toMatchObject({
      weight: { totalWeight: 1.88 },
      price: { status: 'undetermined', reason: '取り扱いのない板厚のため単価を計算できません' },
    })
  })

  it('寸法・数量がそろっていなければ、重量も単価も計算しない', () => {
    expect(calculate({ cuttingMethod: '3', region: '1', material: '0', thickness: '9' })).toEqual({
      weight: null,
      price: { status: 'incomplete' },
    })
    expect(
      calculate({ cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '100', length: '200' }),
    ).toEqual({ weight: null, price: { status: 'incomplete' } })
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

  it('スプライスの寸法切とアイトレは同じ条件になる（切断区分を含めないため、取得結果も同じ）', () => {
    const row = { cuttingMethod: '2', material: '0', thickness: '16', width: '150', length: '400', quantity: '20' }
    const context = { isSplice: true, spliceShot: true }
    const dimensionCut = pricingConditionsOf(
      resolveItemRow(itemRow({ ...row, region: '1' }), ITEM_MASTERS, context),
      AS_OF,
    )
    const irregularCut = pricingConditionsOf(
      resolveItemRow(itemRow({ ...row, region: '2' }), ITEM_MASTERS, context),
      AS_OF,
    )
    expect(irregularCut).toEqual({
      plateTypeId: 'plate-normal',
      materialId: 'mat-ss400',
      thickness: 16,
      asOf: AS_OF,
      specialProductTypeId: 'sp-splice',
      hasShot: true,
    })
    expect(irregularCut).toEqual(dimensionCut)
  })

  it('加工の行は価格マスタの行を取得しない', () => {
    const resolved = resolveItemRow(itemRow({ cuttingMethod: '3', region: '9', thickness: '9' }), ITEM_MASTERS)
    expect(pricingConditionsOf(resolved, AS_OF)).toBeNull()
  })
})

const dummyWeights = { squareWeight: 1, actualWeight: 1, materialWeight: null, displayWeight: 1 }

describe('sumRows（明細の合計）', () => {
  it('重量は計算できた材料の行、金額は単価が決まった行だけを合計し、別途見積もりの行を数える', () => {
    const totals = sumRows([
      {
        kind: 'material',
        calculation: {
          weight: { weights: dummyWeights, totalWeight: 10.5 },
          price: { status: 'priced', unitPrice: 100, priceUnit: 'kg', amount: 1050 },
        },
      },
      {
        kind: 'material',
        calculation: {
          weight: { weights: dummyWeights, totalWeight: 7.03 },
          price: { status: 'quote', reason: '' },
        },
      },
      // 単価が未確定・取得中の行も、重量は合計に含める（単価未定の件数には数えない）
      {
        kind: 'material',
        calculation: {
          weight: { weights: dummyWeights, totalWeight: 2 },
          price: { status: 'undetermined', reason: '' },
        },
      },
      {
        kind: 'material',
        calculation: { weight: { weights: dummyWeights, totalWeight: 1 }, price: { status: 'loading' } },
      },
      { kind: 'material', calculation: { weight: null, price: { status: 'incomplete' } } },
    ])
    expect(totals).toEqual({ totalWeight: 20.53, totalAmount: 1050, quoteCount: 1 })
  })

  it('加工の行の仕入金額も合計に含め、仕入単価が空欄の加工の行は単価未定として数える（重量には含めない）', () => {
    const totals = sumRows([
      {
        kind: 'material',
        calculation: {
          weight: { weights: dummyWeights, totalWeight: 10 },
          price: { status: 'priced', unitPrice: 100, priceUnit: 'kg', amount: 1000 },
        },
      },
      { kind: 'process', calculation: { status: 'priced', amount: 600 } },
      { kind: 'process', calculation: { status: 'unpriced' } },
      { kind: 'process', calculation: { status: 'incomplete' } },
    ])
    expect(totals).toEqual({ totalWeight: 10, totalAmount: 1600, quoteCount: 1 })
  })
})

// 別途見積もりで止まるのは仕入単価・仕入金額だけで、重量は寸法から計算する（docs/screen-design.md
// 「数量／重量・仕入単価／仕入金額」）。重量が別途見積もりの判定に影響されないことを確かめる
describe('calculateItem（別途見積もりの行の重量）', () => {
  // 同じ寸法の、単価が決まる行の重量と比べる
  const pricedWeight = calculate({
    cuttingMethod: '3',
    region: '1',
    material: '0',
    thickness: '9',
    width: '100',
    length: '200',
    quantity: '10',
  })

  it('単価が決まる行（比較の基準）: 9mm・100×200・10 枚 = 14.13kg', () => {
    expect(pricedWeight).toMatchObject({ weight: { totalWeight: 14.13 }, price: { status: 'priced' } })
  })

  it('切断単価が登録されていない（ガス・9mm）: 別途見積もりでも重量は同じ', () => {
    const result = calculate({
      cuttingMethod: '2',
      region: '1',
      material: '0',
      thickness: '9',
      width: '100',
      length: '200',
      quantity: '10',
    })
    expect(result.price).toEqual({
      status: 'quote',
      reason: '該当する切断単価が登録されていないため別途見積もり',
    })
    expect(result.weight).toEqual(pricedWeight.weight)
  })

  it('28mm 以上で 1 枚 2kg 未満（ガス・28mm・80×80）: 別途見積もりでも重量を計算する', () => {
    expect(
      calculate({
        cuttingMethod: '2',
        region: '1',
        material: '0',
        thickness: '28',
        width: '80',
        length: '80',
        quantity: '5',
      }),
    ).toMatchObject({
      // 1 枚 28 × 80 × 80 × 7.85 / 1,000,000 = 1.40672kg
      weight: { weights: { squareWeight: 1.40672, actualWeight: 1.40672 }, totalWeight: 7.03 },
      price: { status: 'quote', reason: '1枚 2kg 未満のため別途見積もり' },
    })
  })

  it('スプライスのアイトレは、寸法切と同じ角重量になる（切断区分は単価だけに影響する）', () => {
    const row = {
      cuttingMethod: '2',
      material: '0',
      thickness: '16',
      width: '150',
      length: '400',
      quantity: '20',
    }
    const dimensionCut = calculateSplice({ ...row, region: '1' }, true)
    const irregularCut = calculateSplice({ ...row, region: '2' }, true)
    expect(dimensionCut.price.status).toBe('priced')
    expect(irregularCut.price.status).toBe('quote')
    expect(irregularCut.weight?.totalWeight).toBe(dimensionCut.weight?.totalWeight)
  })

  it('別途見積もりの行の重量も、明細の重量の合計に含める', () => {
    const quoteRow = calculateSplice(
      { cuttingMethod: '2', region: '2', material: '0', thickness: '16', width: '150', length: '400', quantity: '20' },
      true,
    )
    const totals = sumRows([
      { kind: 'material', calculation: pricedWeight },
      { kind: 'material', calculation: quoteRow },
    ])
    expect(totals).toMatchObject({ totalWeight: 164.85, quoteCount: 1 })
  })
})
