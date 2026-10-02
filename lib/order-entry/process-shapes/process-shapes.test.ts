import { describe, expect, it } from 'vitest'
import { ITEM_MASTERS, itemRow } from '../test-fixtures'
import {
  automaticQuantity,
  checkProcessSpec,
  formatProcessSpec,
  processInputShapeOf,
  specInputFields,
} from './index'

// 加工の行（区分 9）を作る
function processRow(values: Parameters<typeof itemRow>[0]) {
  return itemRow({ region: '9', ...values })
}

describe('processInputShapeOf（入力の形）', () => {
  it('加工方法の番号から、加工種別の入力の形を引く', () => {
    expect(processInputShapeOf(processRow({ processType: '20' }), ITEM_MASTERS)).toBe('穴')
    expect(processInputShapeOf(processRow({ processType: '11' }), ITEM_MASTERS)).toBe('穴')
    expect(processInputShapeOf(processRow({ processType: '24' }), ITEM_MASTERS)).toBe('曲げ')
    expect(processInputShapeOf(processRow({ processType: '22' }), ITEM_MASTERS)).toBe('自由入力')
  })

  it('加工方法が未入力・存在しない番号の間は自由入力', () => {
    expect(processInputShapeOf(processRow({ processType: '' }), ITEM_MASTERS)).toBe('自由入力')
    expect(processInputShapeOf(processRow({ processType: '99' }), ITEM_MASTERS)).toBe('自由入力')
  })
})

describe('穴', () => {
  it('伝票の文は 1S/ 孔数孔 穴径φ', () => {
    const { spec } = checkProcessSpec('穴', processRow({ holesPerPiece: '12', holeDiameter: '38' }))
    expect(spec && formatProcessSpec(spec)).toBe('1S/ 12孔 38φ')
  })

  it('穴径は小数も入力できる', () => {
    const { spec } = checkProcessSpec('穴', processRow({ holesPerPiece: '4', holeDiameter: '17.5' }))
    expect(spec && formatProcessSpec(spec)).toBe('1S/ 4孔 17.5φ')
  })

  it('数量は 1 枚あたりの孔数 × 母材の枚数。母材の枚数がなければ求まらない', () => {
    const { spec } = checkProcessSpec('穴', processRow({ holesPerPiece: '12', holeDiameter: '38' }))
    expect(spec && automaticQuantity(spec, 4)).toBe(48)
    expect(spec && automaticQuantity(spec, null)).toBeNull()
  })

  it('孔数は 1 以上の整数、穴径は正の数', () => {
    const { liveErrors, spec } = checkProcessSpec('穴', processRow({ holesPerPiece: '0', holeDiameter: '0' }))
    expect(liveErrors.holesPerPiece).toBeDefined()
    expect(liveErrors.holeDiameter).toBeDefined()
    expect(spec).toBeNull()
  })

  it('入力順は 孔数 → 穴径', () => {
    expect(specInputFields('穴', processRow({}))).toEqual(['holesPerPiece', 'holeDiameter'])
  })
})

describe('曲げ', () => {
  // 曲げの文を組み立てる（項目がそろわなければ null）
  function bendText(values: Parameters<typeof itemRow>[0]) {
    const { spec } = checkProcessSpec('曲げ', processRow(values))
    return spec ? formatProcessSpec(spec) : null
  }

  it('初期値（0 1ヶ所・0 90°）のままなら 1ヶ所 90°曲げ', () => {
    expect(bendText({})).toBe('1ヶ所 90°曲げ')
  })

  it('二方・三方・四方も後ろに「曲げ」を付ける', () => {
    expect(bendText({ bendCount: '2', bendStyle: '2' })).toBe('2ヶ所 二方曲げ')
    expect(bendText({ bendCount: '4', bendStyle: '4' })).toBe('4ヶ所 四方曲げ')
  })

  it('フリーは入力したヶ所数・文字を使い、後ろに「曲げ」を付ける', () => {
    expect(bendText({ bendStyle: '9', bendStyleFree: 'R' })).toBe('1ヶ所 R曲げ')
    expect(bendText({ bendCount: '9', bendCountFree: '6', bendStyle: '9', bendStyleFree: '85°' })).toBe(
      '6ヶ所 85°曲げ',
    )
  })

  it('フリーで数字・文字が空欄なら保存時のエラー', () => {
    const { errors, spec } = checkProcessSpec('曲げ', processRow({ bendCount: '9', bendStyle: '9' }))
    expect(errors.bendCountFree).toBeDefined()
    expect(errors.bendStyleFree).toBeDefined()
    expect(spec).toBeNull()
  })

  it('存在しない番号はエラー', () => {
    const { liveErrors } = checkProcessSpec('曲げ', processRow({ bendCount: '5', bendStyle: '1' }))
    expect(liveErrors.bendCount).toBe('存在しない番号です')
    expect(liveErrors.bendStyle).toBe('存在しない番号です')
  })

  it('数量は母材の枚数（ヶ所数には関係しない）', () => {
    const { spec } = checkProcessSpec('曲げ', processRow({ bendCount: '3' }))
    expect(spec && automaticQuantity(spec, 10)).toBe(10)
  })

  it('フリーを選んだときだけ、数字・文字の欄が入力順に入る', () => {
    expect(specInputFields('曲げ', processRow({}))).toEqual(['bendCount', 'bendStyle'])
    expect(specInputFields('曲げ', processRow({ bendCount: '9', bendStyle: '9' }))).toEqual([
      'bendCount',
      'bendCountFree',
      'bendStyle',
      'bendStyleFree',
    ])
  })
})

describe('自由入力', () => {
  it('加工内容の文をそのまま使い、数量は自動で求めない', () => {
    const { spec } = checkProcessSpec('自由入力', processRow({ spec: ' 1S/ 2孔 30X12φ ' }))
    expect(spec && formatProcessSpec(spec)).toBe('1S/ 2孔 30X12φ')
    expect(spec && automaticQuantity(spec, 10)).toBeNull()
  })
})
