import { describe, expect, it } from 'vitest'
import {
  copyMaterialWithChildren,
  indexOfMaterialNumber,
  materialNumbers,
  parentIndexOf,
  previousMaterialIndex,
  processInsertIndex,
  removeRowWithChildren,
} from './item-structure'
import { itemRow } from './test-fixtures'

// 行の ID と区分だけを指定して行を作る（区分 9 は加工の行）
function row(key: string, region = '1', extra: Record<string, string> = {}) {
  return { ...itemRow({ region, ...extra }), key }
}

// 1 材料(m1) └加工(p1) └加工(p2) / 2 材料(m2) / 3 材料(m3) └加工(p3)
const ROWS = [
  row('m1', '1', { quantity: '4' }),
  row('p1', '9', { processType: '20' }),
  row('p2', '9', { processType: '22' }),
  row('m2'),
  row('m3'),
  row('p3', '9'),
]

const keys = (rows: { key: string }[]) => rows.map((r) => r.key)

describe('materialNumbers / parentIndexOf', () => {
  it('材料の行だけに 1 から番号を振り、加工の行は null', () => {
    expect(materialNumbers(ROWS)).toEqual([1, null, null, 2, 3, null])
  })

  it('加工の行の母材は、上にあるいちばん近い材料の行', () => {
    expect(parentIndexOf(ROWS, 2)).toBe(0)
    expect(parentIndexOf(ROWS, 5)).toBe(4)
  })

  it('先頭の加工の行には母材がない', () => {
    expect(parentIndexOf([row('p0', '9'), ...ROWS], 0)).toBe(-1)
  })

  it('何も入力していない材料の行は母材にしない（保存しない行のため）', () => {
    const rows = [row('m1'), row('blank', ''), row('p1', '9')]
    expect(parentIndexOf(rows, 2, (r) => r.key === 'blank')).toBe(0)
  })
})

describe('removeRowWithChildren', () => {
  it('材料の行を削除すると、ぶら下がっている加工の行も一緒に削除する', () => {
    expect(keys(removeRowWithChildren(ROWS, 'm1'))).toEqual(['m2', 'm3', 'p3'])
  })

  it('加工の行の削除は、その行だけ', () => {
    expect(keys(removeRowWithChildren(ROWS, 'p1'))).toEqual(['m1', 'p2', 'm2', 'm3', 'p3'])
  })
})

describe('processInsertIndex（「+」で加工の行を入れる位置）', () => {
  it('材料の行では、その材料の最後の加工の行のすぐ下', () => {
    expect(processInsertIndex(ROWS, 'm1')).toBe(3)
    expect(processInsertIndex(ROWS, 'm2')).toBe(4)
  })

  it('加工の行では、その母材の最後の加工の行のすぐ下', () => {
    expect(processInsertIndex(ROWS, 'p1')).toBe(3)
  })
})

describe('copyMaterialWithChildren（「*」の複写）', () => {
  let counter = 0
  const newKey = () => `new${(counter += 1)}`

  it('材料の行を加工の行ごと写し、写した加工の行は写し先のすぐ下に入る', () => {
    counter = 0
    const rows = [...ROWS, row('target', '')]
    const result = copyMaterialWithChildren(rows, 'target', 0, newKey)
    expect(keys(result)).toEqual(['m1', 'p1', 'p2', 'm2', 'm3', 'p3', 'target', 'new1', 'new2'])
    // 写し先は写し元の材料の行の内容（数量も含む）、行の ID は写し先のまま
    expect(result[6]).toMatchObject({ key: 'target', region: '1', quantity: '4' })
    expect(result[7]).toMatchObject({ region: '9', processType: '20' })
  })

  it('途中の行に写した場合も、写した加工の行は写し先のすぐ下に入る', () => {
    counter = 0
    const rows = [row('m1'), row('p1', '9'), row('target', ''), row('m9')]
    expect(keys(copyMaterialWithChildren(rows, 'target', 0, newKey))).toEqual([
      'm1',
      'p1',
      'target',
      'new1',
      'm9',
    ])
  })
})

describe('indexOfMaterialNumber / previousMaterialIndex', () => {
  it('No 欄の番号から材料の行の位置を求める', () => {
    expect(indexOfMaterialNumber(ROWS, 2)).toBe(3)
    expect(indexOfMaterialNumber(ROWS, 9)).toBe(-1)
  })

  it('直前の材料の行は、加工の行を飛ばした上の材料の行', () => {
    const rows = [...ROWS.slice(0, 3), row('target', '')]
    expect(previousMaterialIndex(rows, 'target')).toBe(0)
  })
})
