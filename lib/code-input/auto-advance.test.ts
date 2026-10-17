import { describe, expect, it } from 'vitest'
import { codeAdvance } from './auto-advance'
import type { CodeOption } from './code-option'

const option = (code: string): CodeOption => ({ code, label: code, value: code })

describe('codeAdvance', () => {
  // 切断・区分のような 2 桁の番号と、1 桁の「9」
  const cutRegions = ['11', '12', '41', '42', '47', '71', '9'].map(option)

  it('上限の桁まで打ち、存在する番号なら進む', () => {
    expect(codeAdvance(cutRegions, '41', 2)).toBe('next')
  })

  it('上限の桁まで打ち、存在しない番号ならエラー', () => {
    expect(codeAdvance(cutRegions, '13', 2)).toBe('invalid')
  })

  it('上限より短い途中の番号は待つ', () => {
    expect(codeAdvance(cutRegions, '4', 2)).toBe('wait')
    expect(codeAdvance(cutRegions, '', 2)).toBe('wait')
  })

  it('それより長い番号の先頭にならない番号は、上限より短くても進む（9 加工）', () => {
    expect(codeAdvance(cutRegions, '9', 2)).toBe('next')
  })

  it('同じ番号で始まる長い番号があれば待つ（0 売り先と同じ と 0123）', () => {
    const destinations = ['0', '0123', '1001'].map(option)
    expect(codeAdvance(destinations, '0', 4)).toBe('wait')
    expect(codeAdvance(destinations, '1001', 4)).toBe('next')
  })

  it('1 桁の欄は 1 桁打てば決まる', () => {
    const manufacturers = ['0', '1', '2'].map(option)
    expect(codeAdvance(manufacturers, '1', 1)).toBe('next')
    expect(codeAdvance(manufacturers, '5', 1)).toBe('invalid')
  })
})
