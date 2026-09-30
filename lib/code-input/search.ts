// 選択肢の一覧の検索（売り先・入れ先など、件数の多い番号の欄で使う）。
//
// ふりがな・名前のどちらでも部分一致で探せるようにし、
// ひらがな／カタカナ、全角／半角の違いは区別しない（docs/screen-design.md「入力方式」）。
// 比べる前に、検索語と選択肢の両方を同じ形（正規化した文字列）にそろえてから比べる。

import type { CodeOption } from './code-option'

// カタカナ（ァ〜ヶ）の文字コードの範囲。ひらがな（ぁ〜ゖ）とは 0x60 だけ離れている
const KATAKANA_START = 0x30a1
const KATAKANA_END = 0x30f6
const KATAKANA_TO_HIRAGANA_OFFSET = 0x60

// 検索用に文字列をそろえる。
//   1. NFKC 正規化: 全角英数字 → 半角（Ａ → A、１ → 1）、半角カタカナ → 全角（ｻﾝﾌﾟﾙ → サンプル）、
//      全角スペース → 半角スペース にそろう
//   2. カタカナ → ひらがな（サンプル → さんぷる）
//   3. 英字は小文字にそろえる（ABC → abc）
//   4. 空白を取り除く（「株式会社 サンプル」を「株式会社サンプル」でも探せるように）
export function normalizeForSearch(text: string): string {
  const nfkc = text.normalize('NFKC')
  let hiragana = ''
  for (const char of nfkc) {
    const code = char.codePointAt(0)!
    hiragana +=
      code >= KATAKANA_START && code <= KATAKANA_END
        ? String.fromCodePoint(code - KATAKANA_TO_HIRAGANA_OFFSET)
        : char
  }
  return hiragana.toLowerCase().replace(/\s+/g, '')
}

// 検索語に一致する選択肢だけを返す（名前・ふりがなの部分一致）。
// 検索語が空なら全件を返す。並び順は元の選択肢の順のまま。
export function filterCodeOptions<T>(
  options: readonly CodeOption<T>[],
  query: string,
): CodeOption<T>[] {
  const normalizedQuery = normalizeForSearch(query)
  if (!normalizedQuery) {
    return [...options]
  }
  return options.filter((option) => {
    const targets = [option.label, option.kana ?? '']
    return targets.some((target) => normalizeForSearch(target).includes(normalizedQuery))
  })
}
