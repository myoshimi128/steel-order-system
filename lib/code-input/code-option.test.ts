import { describe, expect, it } from 'vitest'
import { findCodeOption, findOptionByValue, sortByCode, type CodeOption } from './code-option'

const OPTIONS: CodeOption<string>[] = [
  { code: '0', label: '宵積み', value: 'id-0' },
  { code: '2', label: '2便', value: 'id-2' },
  { code: '10', label: '十番', value: 'id-10' },
  { code: '9', label: 'フリー', value: 'id-9' },
]

describe('findCodeOption', () => {
  it('番号が一致する選択肢を返す（前後の空白は無視）', () => {
    expect(findCodeOption(OPTIONS, '2')?.label).toBe('2便')
    expect(findCodeOption(OPTIONS, ' 9 ')?.label).toBe('フリー')
  })

  it('一致しない番号・空欄は undefined', () => {
    expect(findCodeOption(OPTIONS, '5')).toBeUndefined()
    expect(findCodeOption(OPTIONS, '')).toBeUndefined()
  })

  it('「02」と「2」は別の番号として扱う', () => {
    expect(findCodeOption(OPTIONS, '02')).toBeUndefined()
  })
})

describe('findOptionByValue', () => {
  it('値から選択肢を返す', () => {
    expect(findOptionByValue(OPTIONS, 'id-10')?.code).toBe('10')
  })
})

describe('sortByCode', () => {
  it('番号を数値として並べる（10 は 9 の後）', () => {
    expect(sortByCode(OPTIONS).map((option) => option.code)).toEqual(['0', '2', '9', '10'])
  })
})
