import { describe, expect, it } from 'vitest'
import {
  canRegisterWithoutDrawings,
  completeConfirmText,
  countUnassigned,
  originalStateLabel,
  originalStateOf,
  slotCounts,
  type SplitOriginal,
  type SplitSlotFile,
} from './split'

const original = (name: string, splitDone = false): SplitOriginal => ({ id: name, originalName: name, splitDone })
const slotFile = (name: string, slot: SplitSlotFile['slot']): SplitSlotFile => ({
  id: `${slot}-${name}`,
  originalName: name,
  slot,
})

describe('originalStateOf / originalStateLabel', () => {
  it('同じ名前が枠にあれば、その枠に振り分け済み', () => {
    const state = originalStateOf(original('PL9.dxf'), [slotFile('PL9.dxf', 'sakisun')])
    expect(state).toEqual({ kind: 'assigned', slots: ['sakisun'] })
    expect(originalStateLabel(state)).toBe('→先寸')
  })

  it('両方の枠にあれば両方を出す', () => {
    const state = originalStateOf(original('a.dxf'), [slotFile('a.dxf', 'aitore'), slotFile('a.dxf', 'sakisun')])
    expect(originalStateLabel(state)).toBe('→先寸・アイトレ')
  })

  it('枠になく、分割して保存済の印があれば「分割して保存済」', () => {
    const state = originalStateOf(original('組立.dxf', true), [slotFile('組立_先寸.dxf', 'sakisun')])
    expect(originalStateLabel(state)).toBe('分割して保存済')
  })

  it('どれでもなければ未振り分け', () => {
    expect(originalStateLabel(originalStateOf(original('b.dxf'), []))).toBe('未振り分け')
  })
})

describe('countUnassigned', () => {
  it('未振り分けの元データだけを数える', () => {
    const originals = [original('a.dxf'), original('b.dxf', true), original('c.dxf')]
    expect(countUnassigned(originals, [slotFile('a.dxf', 'aitore')])).toBe(1)
  })
})

describe('slotCounts / canRegisterWithoutDrawings', () => {
  it('枠ごとに数える。どちらも空なら図面なしで登録できる', () => {
    const files = [slotFile('a.dxf', 'sakisun'), slotFile('b.dxf', 'sakisun'), slotFile('c.dxf', 'aitore')]
    expect(slotCounts(files)).toEqual({ sakisun: 2, aitore: 1 })
    expect(canRegisterWithoutDrawings(files)).toBe(false)
    expect(canRegisterWithoutDrawings([])).toBe(true)
  })
})

describe('completeConfirmText', () => {
  it('枠のファイルの数と、未振り分けの元データの数を出す', () => {
    expect(completeConfirmText({ sakisun: 3, aitore: 2 }, 1, null)).toBe(
      '先寸 3 ファイル・アイトレ 2 ファイルで振り分けを完了します。\n' +
        '未振り分けの元データが 1 件あります。元データは完了すると削除されます。\n' +
        '完了すると、振り分けはやり直せません。よろしいですか？'
    )
  })

  it('片方の枠だけなら、その枠だけを出す', () => {
    expect(completeConfirmText({ sakisun: 0, aitore: 2 }, 0, null)).toBe(
      'アイトレ 2 ファイルで振り分けを完了します。\n完了すると、振り分けはやり直せません。よろしいですか？'
    )
  })

  it('図面なしで登録するとき', () => {
    expect(completeConfirmText({ sakisun: 0, aitore: 0 }, 0, 'sakisun')).toBe(
      '図面なしで「先寸」として振り分けを完了します。\n完了すると、振り分けはやり直せません。よろしいですか？'
    )
  })
})
