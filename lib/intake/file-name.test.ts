import { describe, expect, it } from 'vitest'
import { downloadFileName } from './file-name'

describe('downloadFileName', () => {
  it('受付No._区分_元の名前', () => {
    expect(downloadFileName('26-1003', 'sakisun', 'PL9.dxf')).toBe('26-1003_先寸_PL9.dxf')
    expect(downloadFileName('26-1003', 'aitore', 'PL9.dxf')).toBe('26-1003_アイトレ_PL9.dxf')
  })

  it('区分がなければ受付No._元の名前', () => {
    expect(downloadFileName('26-1003', null, '注文書.pdf')).toBe('26-1003_注文書.pdf')
  })

  it('受付No. もなければ元の名前のまま', () => {
    expect(downloadFileName(null, null, '注文書.pdf')).toBe('注文書.pdf')
  })

  it('ファイル名に使えない文字は _ にする', () => {
    expect(downloadFileName(null, null, 'a:b?.dxf')).toBe('a_b_.dxf')
  })
})
