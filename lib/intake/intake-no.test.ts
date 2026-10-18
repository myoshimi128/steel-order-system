import { describe, expect, it } from 'vitest'
import { formatIntakeNo, normalizeIntakeNo } from './intake-no'

describe('formatIntakeNo', () => {
  it('年の下 2 桁と、4 桁に 0 埋めした連番をハイフンでつなぐ', () => {
    expect(formatIntakeNo(2026, 1003)).toBe('26-1003')
    expect(formatIntakeNo(2026, 1)).toBe('26-0001')
    expect(formatIntakeNo(2030, 7)).toBe('30-0007')
  })

  it('10000 件目からは桁を増やす', () => {
    expect(formatIntakeNo(2026, 10000)).toBe('26-10000')
  })
})

describe('normalizeIntakeNo', () => {
  it('YY-NNNN はそのまま', () => {
    expect(normalizeIntakeNo('26-1003')).toBe('26-1003')
  })

  it('ハイフンの後の連番は 4 桁に 0 を埋める', () => {
    expect(normalizeIntakeNo('26-1')).toBe('26-0001')
    expect(normalizeIntakeNo('26-12')).toBe('26-0012')
  })

  it('ハイフンなしは、先頭 2 桁を年、残りを連番とみなす', () => {
    expect(normalizeIntakeNo('261003')).toBe('26-1003')
    expect(normalizeIntakeNo('2610000')).toBe('26-10000')
  })

  it('空白で区切ってもよい（前後の空白は無視する）', () => {
    expect(normalizeIntakeNo('26 1003')).toBe('26-1003')
    expect(normalizeIntakeNo(' 26-1003 ')).toBe('26-1003')
  })

  it('連番が 4 桁未満のハイフンなしは、打ちかけと区別できないため null', () => {
    expect(normalizeIntakeNo('2610')).toBeNull()
    expect(normalizeIntakeNo('26')).toBeNull()
  })

  it('形にならない入力は null', () => {
    expect(normalizeIntakeNo('')).toBeNull()
    expect(normalizeIntakeNo('26-')).toBeNull()
    expect(normalizeIntakeNo('2026-1003')).toBeNull()
    expect(normalizeIntakeNo('26-10a3')).toBeNull()
    expect(normalizeIntakeNo('26-1003-1')).toBeNull()
  })

  it('連番が 0 の番号はないため null', () => {
    expect(normalizeIntakeNo('26-0')).toBeNull()
    expect(normalizeIntakeNo('260000')).toBeNull()
  })
})
