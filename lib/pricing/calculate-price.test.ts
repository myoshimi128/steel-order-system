import { describe, expect, it } from 'vitest'
import { calculateCuttingPrice, calculateSpecialProductPrice } from './calculate-price'
import {
  BETAMARU,
  BONDE_PLATE,
  CHECKERED_PLATE,
  MASTERS,
  NORMAL_PLATE,
  SASARA,
  SM400A,
  SN400B,
  SPLICE,
  SS400,
  TMCP385C,
} from './test-fixtures'
import type { PricingMasters } from './types'

// 受注日（単価の基準日）
const AS_OF = '2026-06-01'

describe('calculateCuttingPrice（通常の切断）', () => {
  it('SN400B・レーザー寸法切・9mm・高炉材・1枚1.2kg → 枚単価 285', () => {
    // kg単価 = SS400ベース 170 + 材質EX 10 + 高炉材 10 = 190、1.5kg の段で 190 × 1.5 = 285
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SN400B,
        thickness: 9,
        shape: '定尺',
        cuttingMethod: 'レーザー',
        cuttingType: '寸法切',
        steelMaking: '高炉材',
        asOf: AS_OF,
        squareWeight: 1.2,
      },
      MASTERS,
    )
    expect(result).toMatchObject({
      status: 'priced',
      kgUnitPrice: 190,
      priceUnit: '枚',
      unitPrice: 285,
      billingWeight: 1.5,
    })
  })

  it('TMCP385C・ガス寸法切・40mm・高炉材 → kg単価 294', () => {
    // 専用単価 280 + 板厚EX 4 + 高炉材 10 = 294（専用単価のため材質EXは加算しない）
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: TMCP385C,
        thickness: 40,
        shape: '大板',
        cuttingMethod: 'ガス',
        cuttingType: '寸法切',
        steelMaking: '高炉材',
        asOf: AS_OF,
        squareWeight: 100,
      },
      MASTERS,
    )
    expect(result).toMatchObject({
      status: 'priced',
      kgUnitPrice: 294,
      priceUnit: 'kg',
      unitPrice: 294,
      breakdown: {
        basePrice: 280,
        materialExtra: 0,
        blastFurnaceExtra: 10,
        thicknessExtra: 4,
        largePlateExtra: 0,
        usedDedicatedPrice: true,
      },
    })
  })

  it('SS400・ガス寸法切・28mm・1枚1.5kg → 別途見積もり', () => {
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 28,
        shape: '大板',
        cuttingMethod: 'ガス',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 1.5,
      },
      MASTERS,
    )
    expect(result.status).toBe('quote')
  })

  it('SS400・ガス寸法切・28mm でも 2kg 以上なら kg単価（175 + 板厚EX 1 = 176）', () => {
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 28,
        shape: '大板',
        cuttingMethod: 'ガス',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 2,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', priceUnit: 'kg', unitPrice: 176 })
  })

  it('SS400 は高炉材でも高炉材加算が 0（マスタの値に従う）', () => {
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 16,
        shape: '定尺',
        cuttingMethod: 'ガス',
        cuttingType: '寸法切',
        steelMaking: '高炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', kgUnitPrice: 175 })
  })

  it('大板は大板加算を加える（SN400B・9mm・電炉材: 170 + 10 + 15 = 195）', () => {
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SN400B,
        thickness: 9,
        shape: '大板',
        cuttingMethod: 'レーザー',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', kgUnitPrice: 195 })
  })

  it('専用単価の行には 1.5kg の段がない（SM400A・1枚1.2kg → 178.5 × 2 = 357）', () => {
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SM400A,
        thickness: 12,
        shape: '定尺',
        cuttingMethod: 'レーザー',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 1.2,
      },
      MASTERS,
    )
    expect(result).toMatchObject({
      status: 'priced',
      kgUnitPrice: 178.5,
      priceUnit: '枚',
      unitPrice: 357,
    })
  })

  it('材質を持たない種類（ボンデ）は、高炉材でも材質の加算なし', () => {
    const result = calculateCuttingPrice(
      {
        plateType: BONDE_PLATE,
        materialId: null,
        thickness: 1.6,
        shape: '定尺',
        cuttingMethod: 'シャーリング',
        cuttingType: '寸法切',
        steelMaking: '高炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', kgUnitPrice: 240 })
  })

  it('該当する切断単価の行がなければ別途見積もり（レーザーは 28mm 以上なし）', () => {
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 28,
        shape: '大板',
        cuttingMethod: 'レーザー',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result.status).toBe('quote')
  })

  it('単価が NULL（別途）の行は別途見積もり', () => {
    const masters: PricingMasters = {
      ...MASTERS,
      cuttingPrices: MASTERS.cuttingPrices.map((row) =>
        row.cutting_method === 'ガス' && row.thickness_min === 14
          ? { ...row, unit_price: null }
          : row,
      ),
    }
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 16,
        shape: '定尺',
        cuttingMethod: 'ガス',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      masters,
    )
    expect(result.status).toBe('quote')
  })

  it('材質エキストラが未登録の材質は、誤った単価を出さず別途見積もり', () => {
    const result = calculateCuttingPrice(
      {
        plateType: NORMAL_PLATE,
        materialId: 'mat-unknown',
        thickness: 9,
        shape: '定尺',
        cuttingMethod: 'レーザー',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result.status).toBe('quote')
  })

  it('料金改定後の行は、受注日が適用開始日以降のときだけ使う', () => {
    const masters: PricingMasters = {
      ...MASTERS,
      cuttingPrices: [
        ...MASTERS.cuttingPrices,
        {
          plate_type_id: NORMAL_PLATE.id,
          material_id: null,
          thickness_min: 14,
          thickness_max: 25,
          cutting_method: 'ガス',
          cutting_type: '寸法切',
          unit_price: 180,
          valid_from: '2027-01-01',
          has_light_tier: false,
          small_piece_quote_required: false,
        },
      ],
    }
    const input = {
      plateType: NORMAL_PLATE,
      materialId: SS400,
      thickness: 16,
      shape: '定尺',
      cuttingMethod: 'ガス',
      cuttingType: '寸法切',
      steelMaking: '電炉材',
      squareWeight: 10,
    } as const

    expect(calculateCuttingPrice({ ...input, asOf: '2026-12-31' }, masters)).toMatchObject({
      kgUnitPrice: 175,
    })
    expect(calculateCuttingPrice({ ...input, asOf: '2027-01-01' }, masters)).toMatchObject({
      kgUnitPrice: 180,
    })
  })
})

describe('calculateSpecialProductPrice（特殊製品）', () => {
  it('ベタ丸・普通板・2.3mm → kg単価 235', () => {
    const result = calculateSpecialProductPrice(
      {
        specialProductType: BETAMARU,
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 2.3,
        shape: '定尺',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 5,
      },
      MASTERS,
    )
    // 常に枚単価のため、角重量 5.0kg × 235 = 1175 の枚単価になる
    expect(result).toMatchObject({
      status: 'priced',
      kgUnitPrice: 235,
      priceUnit: '枚',
      unitPrice: 1175,
    })
  })

  it('ベタ丸・普通板・28mm は板厚エキストラが加算されて 201', () => {
    const result = calculateSpecialProductPrice(
      {
        specialProductType: BETAMARU,
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 28,
        shape: '大板',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 50,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', kgUnitPrice: 201 })
  })

  it('ベタ丸・大板・9mm は大板加算が加算されて 190 + 15 = 205', () => {
    const result = calculateSpecialProductPrice(
      {
        specialProductType: BETAMARU,
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 9,
        shape: '大板',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', kgUnitPrice: 205 })
  })

  it('ベタ丸・縞板は材質エキストラを適用しない', () => {
    const result = calculateSpecialProductPrice(
      {
        specialProductType: BETAMARU,
        plateType: CHECKERED_PLATE,
        materialId: SS400,
        thickness: 6,
        shape: '定尺',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', kgUnitPrice: 235 })
  })

  it('スプライス・SN400B・高炉材は 180 + 材質EX 10 + 高炉材 10 = 200（規格材の単価表の値と一致）', () => {
    const result = calculateSpecialProductPrice(
      {
        specialProductType: SPLICE,
        plateType: NORMAL_PLATE,
        materialId: SN400B,
        thickness: 12,
        shape: '定尺',
        cuttingType: '寸法切',
        steelMaking: '高炉材',
        asOf: AS_OF,
        // スプライスは角重量で判定する（weight_basis = 角重量）
        squareWeight: 2.5,
      },
      MASTERS,
    )
    // 角重量 2.5kg < 3kg のため 200 × 3 = 600
    expect(result).toMatchObject({
      status: 'priced',
      kgUnitPrice: 200,
      priceUnit: '枚',
      unitPrice: 600,
      billingWeight: 3,
    })
  })

  it('スプライス・ショットあり・SS400 は 190', () => {
    const result = calculateSpecialProductPrice(
      {
        specialProductType: SPLICE,
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 12,
        shape: '定尺',
        cuttingType: '寸法切',
        hasShot: true,
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 5,
      },
      MASTERS,
    )
    expect(result).toMatchObject({ status: 'priced', priceUnit: 'kg', unitPrice: 190 })
  })

  it('スプライスの 28mm 以上は単価が登録されていないため別途見積もり', () => {
    const result = calculateSpecialProductPrice(
      {
        specialProductType: SPLICE,
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 28,
        shape: '大板',
        cuttingType: '寸法切',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result.status).toBe('quote')
  })

  it('スプライスのアイトレは別途見積もり（寸法切を前提としたセット価格のため）', () => {
    const input = {
      specialProductType: SPLICE,
      plateType: NORMAL_PLATE,
      materialId: SS400,
      thickness: 12,
      shape: '定尺',
      steelMaking: '電炉材',
      asOf: AS_OF,
      squareWeight: 5,
    } as const

    expect(calculateSpecialProductPrice({ ...input, cuttingType: 'アイトレ' }, MASTERS)).toEqual({
      status: 'quote',
      reason: 'アイトレのため別途見積もり',
    })
    // 同じ条件でも寸法切なら単価が出る
    expect(
      calculateSpecialProductPrice({ ...input, cuttingType: '寸法切' }, MASTERS).status,
    ).toBe('priced')
  })

  it('アイトレ別途のフラグがない種別（ベタ丸）は、アイトレでも単価が出る', () => {
    const result = calculateSpecialProductPrice(
      {
        specialProductType: BETAMARU,
        plateType: NORMAL_PLATE,
        materialId: SS400,
        thickness: 9,
        shape: '定尺',
        cuttingType: 'アイトレ',
        steelMaking: '電炉材',
        asOf: AS_OF,
        squareWeight: 10,
      },
      MASTERS,
    )
    expect(result.status).toBe('priced')
  })

  it('ササラは使用材重量で計算し、未入力なら単価を出さない', () => {
    const input = {
      specialProductType: SASARA,
      plateType: NORMAL_PLATE,
      materialId: SS400,
      thickness: 9,
      shape: '定尺',
      cuttingType: '寸法切',
      steelMaking: '電炉材',
      asOf: AS_OF,
      squareWeight: 1,
    } as const

    expect(calculateSpecialProductPrice(input, MASTERS).status).toBe('quote')
    expect(calculateSpecialProductPrice({ ...input, materialWeight: 40 }, MASTERS)).toMatchObject({
      status: 'priced',
      priceUnit: 'kg',
      unitPrice: 200,
      billingWeight: 40,
    })
  })
})
