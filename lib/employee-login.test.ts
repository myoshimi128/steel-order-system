import { describe, expect, it } from 'vitest'
import { employeeNoToEmail, normalizeEmployeeNo } from './employee-login'

describe('normalizeEmployeeNo', () => {
  it('英大文字と数字はそのまま', () => {
    expect(normalizeEmployeeNo('U00001')).toBe('U00001')
    expect(normalizeEmployeeNo('12345')).toBe('12345')
  })

  it('小文字・全角・前後の空白をそろえる', () => {
    expect(normalizeEmployeeNo('u00001')).toBe('U00001')
    expect(normalizeEmployeeNo('Ｕ００００１')).toBe('U00001')
    expect(normalizeEmployeeNo('  U00001 ')).toBe('U00001')
  })

  it('形に合わない入力は null', () => {
    expect(normalizeEmployeeNo('')).toBeNull()
    expect(normalizeEmployeeNo('   ')).toBeNull()
    expect(normalizeEmployeeNo('U-0001')).toBeNull()
    expect(normalizeEmployeeNo('u00001@staff.invalid')).toBeNull()
    expect(normalizeEmployeeNo('U 0001')).toBeNull()
    expect(normalizeEmployeeNo('U000000001')).toBe('U000000001')
    expect(normalizeEmployeeNo('U0000000001')).toBeNull()
  })
})

describe('employeeNoToEmail', () => {
  it('小文字にして、ログイン用のドメインを付ける', () => {
    expect(employeeNoToEmail('U00001')).toBe('u00001@staff.invalid')
  })
})
