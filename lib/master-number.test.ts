import { describe, expect, it } from 'vitest'
import { isDigitsOnly, isNumberUniqueViolation, readMasterNumber } from './master-number'

// FormData に number 欄だけを入れて作るヘルパー
function formWithNumber(value: string | null): FormData {
  const formData = new FormData()
  if (value !== null) {
    formData.set('number', value)
  }
  return formData
}

describe('isDigitsOnly', () => {
  it('数字だけなら true', () => {
    expect(isDigitsOnly('1001')).toBe(true)
    expect(isDigitsOnly('0')).toBe(true)
  })

  it('英字・記号・空文字を含むと false', () => {
    expect(isDigitsOnly('C001')).toBe(false)
    expect(isDigitsOnly('-1')).toBe(false)
    expect(isDigitsOnly('1.5')).toBe(false)
    expect(isDigitsOnly('')).toBe(false)
  })
})

describe('readMasterNumber', () => {
  it('0 以上の整数を数値で返す（前後の空白は取り除く）', () => {
    expect(readMasterNumber(formWithNumber(' 14 '))).toEqual({ ok: true, value: 14 })
    expect(readMasterNumber(formWithNumber('0'))).toEqual({ ok: true, value: 0 })
  })

  it('未入力はエラー', () => {
    expect(readMasterNumber(formWithNumber(null)).ok).toBe(false)
    expect(readMasterNumber(formWithNumber('  ')).ok).toBe(false)
  })

  it('整数でない値はエラー', () => {
    expect(readMasterNumber(formWithNumber('1.5')).ok).toBe(false)
    expect(readMasterNumber(formWithNumber('-1')).ok).toBe(false)
    expect(readMasterNumber(formWithNumber('a')).ok).toBe(false)
  })
})

describe('isNumberUniqueViolation', () => {
  it('番号の一意制約違反だけを true にする', () => {
    expect(
      isNumberUniqueViolation({
        code: '23505',
        message: 'duplicate key value violates unique constraint "materials_number_key"',
      }),
    ).toBe(true)
  })

  it('名前の一意制約違反や、他のエラーは false', () => {
    expect(
      isNumberUniqueViolation({
        code: '23505',
        message: 'duplicate key value violates unique constraint "materials_name_key"',
      }),
    ).toBe(false)
    expect(isNumberUniqueViolation({ code: '23514', message: 'materials_number_check' })).toBe(
      false,
    )
  })
})
