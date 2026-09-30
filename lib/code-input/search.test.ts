import { describe, expect, it } from 'vitest'
import type { CodeOption } from './code-option'
import { filterCodeOptions, normalizeForSearch } from './search'

describe('normalizeForSearch', () => {
  it('カタカナをひらがなにそろえる', () => {
    expect(normalizeForSearch('サンプルテッコウ')).toBe('さんぷるてっこう')
    expect(normalizeForSearch('ヴァ')).toBe('ゔぁ')
  })

  it('半角カタカナを全角にしてから、ひらがなにそろえる（濁点・半濁点も 1 文字にまとめる）', () => {
    expect(normalizeForSearch('ｻﾝﾌﾟﾙ')).toBe('さんぷる')
    expect(normalizeForSearch('ｶﾞｽ')).toBe('がす')
  })

  it('全角英数字を半角にし、英字は小文字にそろえる', () => {
    expect(normalizeForSearch('ＡＢＣ１２３')).toBe('abc123')
    expect(normalizeForSearch('Abc')).toBe('abc')
  })

  it('全角・半角の空白を取り除く', () => {
    expect(normalizeForSearch('株式会社　サンプル 鉄工')).toBe('株式会社さんぷる鉄工')
  })

  it('ひらがな・漢字はそのまま', () => {
    expect(normalizeForSearch('さんぷる建設')).toBe('さんぷる建設')
  })

  it('長音記号「ー」はそのまま残す（カタカナの範囲外のため）', () => {
    expect(normalizeForSearch('スーパー')).toBe('すーぱー')
  })
})

describe('filterCodeOptions', () => {
  const OPTIONS: CodeOption<string>[] = [
    { code: '1001', label: '株式会社サンプル鉄工', value: 'c1', kana: 'さんぷるてっこう' },
    { code: '1002', label: 'テスト建設', value: 'c2', kana: 'テストケンセツ' },
    { code: '1003', label: '見本工業', value: 'c3' },
  ]

  it('名前の部分一致で絞り込む（ひらがな・カタカナを区別しない）', () => {
    expect(filterCodeOptions(OPTIONS, 'さんぷる').map((o) => o.code)).toEqual(['1001'])
    expect(filterCodeOptions(OPTIONS, 'てすと').map((o) => o.code)).toEqual(['1002'])
  })

  it('ふりがなの部分一致で絞り込む（カタカナで登録したふりがなをひらがなで探せる）', () => {
    expect(filterCodeOptions(OPTIONS, 'てっこう').map((o) => o.code)).toEqual(['1001'])
    expect(filterCodeOptions(OPTIONS, 'けんせつ').map((o) => o.code)).toEqual(['1002'])
  })

  it('半角カタカナの検索語でも探せる', () => {
    expect(filterCodeOptions(OPTIONS, 'ｹﾝｾﾂ').map((o) => o.code)).toEqual(['1002'])
  })

  it('漢字の名前でも探せる（ふりがながない行も名前で探せる）', () => {
    expect(filterCodeOptions(OPTIONS, '工業').map((o) => o.code)).toEqual(['1003'])
  })

  it('検索語が空（空白のみ）なら全件を元の順のまま返す', () => {
    expect(filterCodeOptions(OPTIONS, '').map((o) => o.code)).toEqual(['1001', '1002', '1003'])
    expect(filterCodeOptions(OPTIONS, '　').map((o) => o.code)).toEqual(['1001', '1002', '1003'])
  })

  it('一致しなければ空', () => {
    expect(filterCodeOptions(OPTIONS, 'ぞうきん')).toEqual([])
  })
})
