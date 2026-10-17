// 番号の欄で、打った番号から「自動で次の欄へ進むか」を判定する（docs/screen-design.md「番号の桁数と自動で次へ」）。
//
//   next    : 次の欄へ進む
//             ・上限の桁まで打ち、存在する番号だった
//             ・上限の桁より短くても、存在する番号で、それより長い番号の先頭にもならない
//               （切断・区分の「9 加工」。9 で始まる 2 桁の番号はないため、9 だけで決まる）
//   invalid : 上限の桁まで打ったが、存在しない番号だった（進まずにその欄でエラーを出す）
//   wait    : まだ途中（Enter で確定するか、続きを打つ）
//
// 画面に依存しない純粋な関数にしてテストで確認する。

import { findCodeOption, type CodeOption } from './code-option'

export type CodeAdvance = 'next' | 'invalid' | 'wait'

export function codeAdvance<T>(options: readonly CodeOption<T>[], code: string, maxLength: number): CodeAdvance {
  const trimmed = code.trim()
  if (!trimmed) {
    return 'wait'
  }
  const matched = findCodeOption(options, trimmed) !== undefined
  // 今の番号を先頭に持つ、もっと長い番号があるか（あれば続きを打つかもしれないため待つ）
  const hasLonger = options.some((option) => option.code !== trimmed && option.code.startsWith(trimmed))
  if (matched && !hasLonger) {
    return 'next'
  }
  if (trimmed.length >= maxLength) {
    return matched ? 'next' : 'invalid'
  }
  return 'wait'
}
