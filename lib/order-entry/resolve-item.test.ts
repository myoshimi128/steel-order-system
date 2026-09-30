import { describe, expect, it } from 'vitest'
import { regionOptions } from './item-options'
import {
  fitsInStandardPlate,
  isBlankRow,
  parsePositiveNumber,
  parseQuantity,
  resolveItemRow,
  selectProduct,
} from './resolve-item'
import { INITIAL_ITEM_ROW } from './item-row'
import { ITEM_MASTERS, itemRow } from './test-fixtures'

describe('fitsInStandardPlate（定尺 1524 × 3048 に収まるか）', () => {
  it('定尺ちょうどと、それより小さい部品は収まる', () => {
    expect(fitsInStandardPlate(1524, 3048)).toBe(true)
    expect(fitsInStandardPlate(100, 200)).toBe(true)
  })

  it('縦横を入れ替えて収まる場合も収まる', () => {
    expect(fitsInStandardPlate(3048, 1524)).toBe(true)
    expect(fitsInStandardPlate(3000, 1000)).toBe(true)
  })

  it('どちら向きでも収まらなければ定尺を超える', () => {
    expect(fitsInStandardPlate(1525, 3048)).toBe(false)
    expect(fitsInStandardPlate(1600, 1600)).toBe(false)
    expect(fitsInStandardPlate(100, 3049)).toBe(false)
  })
})

describe('selectProduct（商品と、大板加算の有無の決め方）', () => {
  const base = {
    products: ITEM_MASTERS.products,
    plateTypeId: 'plate-normal',
    materialId: 'mat-ss400',
    isStandardSale: false,
  }

  it('定尺に収まる部品は、定尺の商品を使い、大板加算はかけない', () => {
    expect(selectProduct({ ...base, thickness: 9, exceedsStandard: false })).toEqual({
      ok: true,
      product: expect.objectContaining({ id: 'p-ss400-9-std' }),
      pricingShape: '定尺',
    })
  })

  it('定尺を超える部品は、大板の商品を使い、大板加算をかける', () => {
    expect(selectProduct({ ...base, thickness: 9, exceedsStandard: true })).toEqual({
      ok: true,
      product: expect.objectContaining({ id: 'p-ss400-9-large' }),
      pricingShape: '大板',
    })
  })

  it('大板の商品しかない板厚は、小さな部品でも大板の商品を使う（大板加算はかけない）', () => {
    expect(selectProduct({ ...base, thickness: 28, exceedsStandard: false })).toEqual({
      ok: true,
      product: expect.objectContaining({ id: 'p-ss400-28-large' }),
      pricingShape: '定尺',
    })
  })

  it('定尺を超える部品で大板の商品がなければ、商品を特定できない', () => {
    expect(
      selectProduct({ ...base, materialId: 'mat-sn400b', thickness: 9, exceedsStandard: true }).ok,
    ).toBe(false)
  })

  it('定尺売りは定尺の商品だけを使う', () => {
    expect(
      selectProduct({ ...base, thickness: 28, exceedsStandard: false, isStandardSale: true }).ok,
    ).toBe(false)
    expect(
      selectProduct({ ...base, thickness: 9, exceedsStandard: false, isStandardSale: true }),
    ).toMatchObject({ ok: true, product: { id: 'p-ss400-9-std' } })
  })

  it('取り扱いのない板厚は、商品を特定できない', () => {
    expect(selectProduct({ ...base, thickness: 14, exceedsStandard: false }).ok).toBe(false)
  })
})

describe('parsePositiveNumber / parseQuantity', () => {
  it('板厚・寸法は正の数（小数可）', () => {
    expect(parsePositiveNumber('3.2')).toBe(3.2)
    expect(parsePositiveNumber('0')).toBeNull()
    expect(parsePositiveNumber('-1')).toBeNull()
    expect(parsePositiveNumber('a')).toBeNull()
  })

  it('数量は 1 以上の整数', () => {
    expect(parseQuantity('10')).toBe(10)
    expect(parseQuantity('0')).toBeNull()
    expect(parseQuantity('1.5')).toBeNull()
  })
})

describe('resolveItemRow', () => {
  it('ベタ丸の外径 300 は定尺に収まるため、定尺の商品を使う', () => {
    const resolved = resolveItemRow(
      itemRow({ cuttingMethod: '3', region: '7', material: '0', thickness: '9', outerDiameter: '300', quantity: '10' }),
      ITEM_MASTERS,
    )
    expect(resolved.dimensionKind).toBe('circle')
    expect(resolved.exceedsStandard).toBe(false)
    expect(resolved.productSelection).toMatchObject({ ok: true, product: { id: 'p-ss400-9-std' } })
  })

  it('縞板・定尺売りは製鋼法を入力しない（NULL）', () => {
    const checkered = resolveItemRow(itemRow({ plateType: '1', steelMaking: '2' }), ITEM_MASTERS)
    expect(checkered.steelMakingApplicable).toBe(false)
    expect(checkered.steelMaking).toBeNull()

    const standard = resolveItemRow(itemRow({ cuttingMethod: '9', region: '3' }), ITEM_MASTERS)
    expect(standard.steelMakingApplicable).toBe(false)
  })

  it('縞板はメーカー必須で、メーカー × 板厚の単位質量を引く', () => {
    const resolved = resolveItemRow(
      itemRow({ plateType: '1', material: '0', manufacturer: '1', thickness: '3.2' }),
      ITEM_MASTERS,
    )
    expect(resolved.needsManufacturer).toBe(true)
    expect(resolved.unitWeight).toBe(26.82)

    const noUnitWeight = resolveItemRow(
      itemRow({ plateType: '1', material: '0', manufacturer: '2', thickness: '3.2' }),
      ITEM_MASTERS,
    )
    expect(noUnitWeight.unitWeight).toBeNull()
  })

  it('ボンデは材質を持たない', () => {
    const resolved = resolveItemRow(itemRow({ plateType: '2', material: '0' }), ITEM_MASTERS)
    expect(resolved.needsMaterial).toBe(false)
    expect(resolved.materialId).toBeNull()
  })
})

describe('regionOptions', () => {
  it('固定の区分と特殊製品種別を番号順に並べ、スプライス受注用の種別は出さない', () => {
    expect(regionOptions(ITEM_MASTERS).map((option) => `${option.code} ${option.label}`)).toEqual([
      '1 寸法切',
      '2 アイトレ',
      '3 定尺',
      '5 ササラ',
      '7 ベタ丸',
      '9 加工',
    ])
  })
})

describe('isBlankRow', () => {
  it('初期値のままの行は、何も入力していない行とみなす', () => {
    expect(isBlankRow(itemRow({}), INITIAL_ITEM_ROW)).toBe(true)
    expect(isBlankRow(itemRow({ quantity: '1' }), INITIAL_ITEM_ROW)).toBe(false)
  })
})
