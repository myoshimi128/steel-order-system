import { describe, expect, it } from 'vitest'
import { paginateSlipLines } from './slip-pages'
import type { SlipLine, SlipMaterialLine, SlipProcessLine } from './types'

function material(lineNo: number): SlipMaterialLine {
  return {
    kind: 'material',
    lineNo,
    cuttingMethod: 'レーザー',
    productName: 'SS400 寸法切 9 X 100 X 100',
    thickness: 9,
    quantity: 1,
    weight: 0.71,
    lineMark: null,
    thicknessBreak: false,
  }
}

function processLine(parentLineNo: number): SlipProcessLine {
  return { kind: 'process', parentLineNo, text: 'キリ孔 1S/ 2孔 22φ', quantity: 2 }
}

// ページごとの行の見出し（材料の行は行番号、加工の行は p）
function shape(pages: SlipLine[][]): string[][] {
  return pages.map((page) => page.map((line) => (line.kind === 'material' ? String(line.lineNo) : 'p')))
}

describe('paginateSlipLines', () => {
  it('明細がなくても 1 ページ出す', () => {
    expect(paginateSlipLines([], 4)).toEqual([[]])
  })

  it('1 ページの行数で分ける', () => {
    const lines = [1, 2, 3, 4, 5].map(material)
    expect(shape(paginateSlipLines(lines, 2))).toEqual([['1', '2'], ['3', '4'], ['5']])
  })

  it('材料の行と加工の行は同じページに置く（入らなければ次のページから）', () => {
    const lines = [material(1), material(2), material(3), processLine(3), processLine(3)]
    expect(shape(paginateSlipLines(lines, 4))).toEqual([['1', '2'], ['3', 'p', 'p']])
  })

  it('1 ページを超えるまとまりだけは途中で分ける', () => {
    const lines = [material(1), processLine(1), processLine(1), processLine(1), material(2)]
    expect(shape(paginateSlipLines(lines, 3))).toEqual([['1', 'p', 'p'], ['p', '2']])
  })
})
