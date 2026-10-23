import { describe, expect, it } from 'vitest'
import {
  buildSlipLines,
  cutRegionLabel,
  dimensionText,
  lineMarkSummaries,
  processSpecFromStored,
  processText,
  productNameText,
  sumSlipLines,
} from './slip-lines'
import type { SlipItemSource, SlipProcessSource } from './types'

// 普通板 SS400 の寸法切（電炉材）の行。テストごとに違うところだけを上書きする
function item(overrides: Partial<SlipItemSource> = {}): SlipItemSource {
  return {
    lineNo: 1,
    cuttingMethod: 'レーザー',
    cuttingType: '寸法切',
    plateTypeNumber: 0,
    plateTypeName: '普通板',
    materialName: 'SS400',
    materialDefaultSteelMaking: '電炉材',
    lineMark: null,
    displayColor: null,
    thickness: 40,
    steelMaking: '電炉材',
    manufacturerName: null,
    specialProduct: null,
    plateSize: null,
    width: 660,
    length: 660,
    outerDiameter: null,
    innerDiameter: null,
    quantity: 4,
    squareWeight: 136.7856,
    actualWeight: 136.7856,
    materialWeight: null,
    unitPrice: null,
    priceUnit: null,
    processes: [],
    ...overrides,
  }
}

function process(overrides: Partial<SlipProcessSource> = {}): SlipProcessSource {
  return {
    lineNo: 1,
    processTypeName: 'キリ孔',
    spec: null,
    specFields: { shape: '穴', holes_per_piece: 12, hole_diameter: 38 },
    quantity: 48,
    unitPrice: null,
    priceUnit: '個',
    ...overrides,
  }
}

describe('productNameText', () => {
  it('材質・区分・寸法を並べる（普通板・いつもの製鋼法は出さない）', () => {
    expect(productNameText(item())).toBe('SS400 寸法切 40 X 660 X 660')
  })

  it('規格材の高炉（材質の初期値）は出さない', () => {
    expect(
      productNameText(item({ materialName: 'SN490C', materialDefaultSteelMaking: '高炉材', steelMaking: '高炉材' }))
    ).toBe('SN490C 寸法切 40 X 660 X 660')
  })

  it('材質の初期値と違う製鋼法は出す', () => {
    expect(productNameText(item({ steelMaking: '高炉材' }))).toBe('SS400 高炉 寸法切 40 X 660 X 660')
  })

  it('普通板以外は種類を出し、メーカー指定を添える', () => {
    expect(
      productNameText(
        item({
          plateTypeNumber: 2,
          plateTypeName: '縞板',
          materialName: null,
          steelMaking: null,
          cuttingType: 'アイトレ',
          thickness: 3.2,
          width: 1219,
          length: 2438,
          manufacturerName: 'メーカーA',
        })
      )
    ).toBe('縞板 アイトレ 3.2 X 1219 X 2438（メーカーA指定）')
  })
})

describe('cutRegionLabel', () => {
  it('シャーリングのアイトレは型切り', () => {
    expect(cutRegionLabel(item({ cuttingMethod: 'シャーリング', cuttingType: 'アイトレ' }))).toBe('型切り')
    expect(cutRegionLabel(item({ cuttingMethod: 'ガス', cuttingType: 'アイトレ' }))).toBe('アイトレ')
  })

  it('定尺売り（切断方法なし）は定尺', () => {
    expect(cutRegionLabel(item({ cuttingMethod: null, cuttingType: null }))).toBe('定尺')
  })

  it('特殊製品は種別の名前、スプライスは切断区分', () => {
    const betamaru = { name: 'ベタ丸', isSpliceOrderType: false, weightBasis: '実重量' }
    const splice = { name: 'スプライス', isSpliceOrderType: true, weightBasis: '角重量' }
    expect(cutRegionLabel(item({ cuttingType: null, specialProduct: betamaru }))).toBe('ベタ丸')
    expect(cutRegionLabel(item({ cuttingType: '寸法切', specialProduct: splice }))).toBe('寸法切')
  })
})

describe('dimensionText', () => {
  it('円・ドーナツ・定尺', () => {
    expect(dimensionText(item({ thickness: 9, width: null, length: null, outerDiameter: 300 }))).toBe('9 X φ300')
    expect(
      dimensionText(item({ thickness: 9, width: null, length: null, outerDiameter: 300, innerDiameter: 100 }))
    ).toBe('9 X φ300-φ100')
    expect(dimensionText(item({ thickness: 4.5, width: null, length: null, plateSize: '4x8' }))).toBe('4.5 X 4x8')
  })
})

describe('processSpecFromStored・processText', () => {
  it('穴の項目から加工内容を組み立てる', () => {
    expect(processText(process())).toBe('キリ孔 1S/ 12孔 38φ')
  })

  it('曲げの項目から組み立てる（フリーの曲げ方も）', () => {
    expect(
      processText(
        process({
          processTypeName: '曲げ',
          specFields: { shape: '曲げ', bend_count: 2, bend_style: '二方', bend_style_note: null },
        })
      )
    ).toBe('曲げ 2ヶ所 二方曲げ')
    expect(
      processText(
        process({
          processTypeName: '曲げ',
          specFields: { shape: '曲げ', bend_count: 1, bend_style: 'フリー', bend_style_note: 'R' },
        })
      )
    ).toBe('曲げ 1ヶ所 R曲げ')
  })

  it('自由入力は spec 列の文。空なら加工方法だけ', () => {
    expect(processText(process({ processTypeName: '開先', specFields: null, spec: 'レ形 35°' }))).toBe('開先 レ形 35°')
    expect(processText(process({ processTypeName: '開先', specFields: null, spec: null }))).toBe('開先')
  })

  it('項目がそろっていなければ自由入力として扱う', () => {
    expect(processSpecFromStored({ spec: 'メモ', specFields: { shape: '穴', holes_per_piece: 12 } })).toEqual({
      shape: '自由入力',
      text: 'メモ',
    })
  })
})

describe('buildSlipLines', () => {
  it('重量は 1 枚あたり × 枚数を小数第 2 位までに丸める（ベタ丸は実重量、ササラは使用材重量）', () => {
    const lines = buildSlipLines([
      item({ lineNo: 1, squareWeight: 1.23456, quantity: 3 }),
      item({
        lineNo: 2,
        width: null,
        length: null,
        outerDiameter: 300,
        squareWeight: 6.3585,
        actualWeight: 4.98,
        quantity: 2,
      }),
      item({ lineNo: 3, squareWeight: 10, actualWeight: null, materialWeight: 12.5, quantity: 1 }),
    ])
    expect(lines.map((line) => (line.kind === 'material' ? line.weight : null))).toEqual([3.7, 9.96, 12.5])
  })

  it('加工の行は母材のすぐ下に並び、板厚が変わる行に区切りの印を付ける（並びは入力の順のまま）', () => {
    const lines = buildSlipLines([
      item({ lineNo: 2, thickness: 12 }),
      item({ lineNo: 1, thickness: 9, processes: [process()] }),
      item({ lineNo: 3, thickness: 12 }),
    ])
    expect(lines.map((line) => (line.kind === 'material' ? `${line.lineNo}:${line.thicknessBreak}` : 'p'))).toEqual([
      '1:false',
      'p',
      '2:true',
      '3:false',
    ])
  })

  it('材質ラインは、ラインが登録されている材質の行だけに付ける', () => {
    const [plain, lined] = buildSlipLines([
      item({ lineNo: 1 }),
      item({ lineNo: 2, materialName: 'SN490C', lineMark: '青2本', displayColor: '青' }),
    ])
    expect(plain.kind === 'material' && plain.lineMark).toBeNull()
    expect(lined.kind === 'material' && lined.lineMark).toEqual({ text: '青2本', color: '#1d4ed8' })
  })

  it('単価記入用の金額（kg 単価・枚単価・加工の個・kg）', () => {
    const lines = buildSlipLines([
      item({
        lineNo: 1,
        squareWeight: 1.23456,
        quantity: 3,
        unitPrice: 100.5,
        priceUnit: 'kg',
        processes: [
          process({ unitPrice: 15, priceUnit: '個', quantity: 48 }),
          process({ lineNo: 2, unitPrice: 30, priceUnit: 'kg', quantity: 3 }),
        ],
      }),
      item({ lineNo: 2, unitPrice: 536, priceUnit: '枚', quantity: 2 }),
      item({ lineNo: 3, unitPrice: null, priceUnit: null }),
    ])
    // 100.5 × 3.70（1.23456 × 3 を丸めた重量）= 371.85 → 372 円
    expect(lines.map((line) => line.amount)).toEqual([372, 720, 111, 1072, null])
    // 重量は材料の行だけ（3.70 + 273.57 + 547.14）。単価が決まっていない行は 3 行目の 1 行
    expect(sumSlipLines(lines)).toEqual({ totalWeight: 824.41, totalAmount: 2275, unpricedCount: 1 })
  })
})

describe('lineMarkSummaries', () => {
  it('材質ごとに 1 つ、明細に出てきた順にまとめる', () => {
    expect(
      lineMarkSummaries([
        item({ lineNo: 3, materialName: 'SM490A', lineMark: '赤1本', displayColor: '赤' }),
        item({ lineNo: 1, materialName: 'SN490C', lineMark: '青2本', displayColor: '#00f' }),
        item({ lineNo: 2, materialName: 'SN490C', lineMark: '青2本', displayColor: '#00f' }),
        item({ lineNo: 4 }),
      ])
    ).toEqual([
      { materialName: 'SN490C', text: '青2本', color: '#00f' },
      { materialName: 'SM490A', text: '赤1本', color: '#dc2626' },
    ])
  })
})
