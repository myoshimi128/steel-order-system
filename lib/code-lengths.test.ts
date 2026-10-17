import { describe, expect, it } from 'vitest'
import { countDigits, isThicknessWithinDigits } from './code-lengths'

describe('countDigits', () => {
  it('小数点は数えず、数字の数で数える', () => {
    expect(countDigits('16')).toBe(2)
    expect(countDigits('1.6')).toBe(2)
    expect(countDigits('9')).toBe(1)
    expect(countDigits('1.')).toBe(1)
  })
})

describe('isThicknessWithinDigits', () => {
  it('数字 2 桁までの板厚は true', () => {
    expect(isThicknessWithinDigits(1.6)).toBe(true)
    expect(isThicknessWithinDigits(9)).toBe(true)
    expect(isThicknessWithinDigits(60)).toBe(true)
  })

  it('3 桁以上・0 以下は false', () => {
    expect(isThicknessWithinDigits(12.5)).toBe(false)
    expect(isThicknessWithinDigits(100)).toBe(false)
    expect(isThicknessWithinDigits(0)).toBe(false)
  })
})
