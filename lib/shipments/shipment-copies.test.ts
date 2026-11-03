import { describe, expect, it } from 'vitest'
import { buildSheetLines, SHIPMENT_COPIES, sumSheetLines } from './shipment-copies'
import type { IssuedShipmentLine } from './types'

const lines: IssuedShipmentLine[] = [
  {
    lineNo: 2,
    cuttingMethod: 'ガス',
    productName: 'SS400 アイトレ 12 X 500 X 500',
    processes: [],
    quantity: 3,
    squareWeight: 70.65,
    // 実重量が未入力
    actualWeight: null,
  },
  {
    lineNo: 1,
    cuttingMethod: 'シャーリング',
    productName: 'SS400 寸法切 9 X 300 X 600',
    processes: ['キリ孔 1S/ 4孔 22φ'],
    quantity: 6,
    squareWeight: 76.3,
    actualWeight: 76.3,
  },
]

const copy = (kind: string) => SHIPMENT_COPIES.find((item) => item.kind === kind)!

describe('SHIPMENT_COPIES', () => {
  it('4 部。積み込み用・運転手用は実重量、受領書・送り状は角重量とサインの欄', () => {
    expect(SHIPMENT_COPIES.map((item) => [item.title, item.weight, item.signature])).toEqual([
      ['積み込み用', 'actual', false],
      ['運転手用（倉出し）', 'actual', false],
      ['受領書（お客様控え）', 'square', true],
      ['送り状（弊社控え）', 'square', true],
    ])
  })
})

describe('buildSheetLines', () => {
  it('行番号の順に並べ、加工の行を母材の下に置く', () => {
    const result = buildSheetLines(lines, copy('receipt'))
    expect(result.map((line) => (line.kind === 'material' ? line.lineNo : `└${line.parentLineNo}`))).toEqual([1, '└1', 2])
  })

  it('角重量の部は角重量を出す', () => {
    const result = buildSheetLines(lines, copy('office'))
    expect(result.filter((line) => line.kind === 'material').map((line) => [line.weight, line.estimated])).toEqual([
      [76.3, false],
      [70.65, false],
    ])
  })

  it('実重量の部は実重量。未入力の行は角重量で代わりに数え、印を付ける', () => {
    const result = buildSheetLines(lines, copy('loading'))
    expect(result.filter((line) => line.kind === 'material').map((line) => [line.weight, line.estimated])).toEqual([
      [76.3, false],
      [70.65, true],
    ])
    expect(sumSheetLines(result)).toEqual({ quantity: 9, weight: 146.95, estimatedCount: 1 })
  })
})
