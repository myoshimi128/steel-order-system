// 番号入力の欄（CodeField）で選ぶ選択肢の型と、番号から選択肢を探す処理。
//
// 受注登録画面では、選ぶ項目をすべて「番号の欄＋名称表示」にしている
// （docs/screen-design.md「入力方式」）。番号は固定の選択肢ならアプリ側の定数、
// マスタの選択肢ならマスタの number 列や code 列から作る。

export type CodeOption<T = string> = {
  // 画面で入力する番号（'0'・'12'・'1001' など）。数字の文字列として扱う
  code: string
  // 番号の右に表示する名称
  label: string
  // 保存に使う値（マスタなら id、定数なら DB に保存する値）
  value: T
  // 名称のふりがな（得意先・納入先など）。一覧の検索に使う。ない場合は名称だけで検索する
  kana?: string
}

// 入力された番号に一致する選択肢を返す。見つからなければ undefined。
// 前後の空白は無視する。「01」と「1」は別の番号として扱う（番号は文字列で比較する）。
export function findCodeOption<T>(
  options: readonly CodeOption<T>[],
  code: string,
): CodeOption<T> | undefined {
  const trimmed = code.trim()
  if (!trimmed) {
    return undefined
  }
  return options.find((option) => option.code === trimmed)
}

// 値（id など）から選択肢を探す。保存済みの値から番号・名称を表示するときに使う
export function findOptionByValue<T>(
  options: readonly CodeOption<T>[],
  value: T,
): CodeOption<T> | undefined {
  return options.find((option) => option.value === value)
}

// 選択肢を番号の数値順に並べる。
// 文字列のまま並べると '10' が '9' より前になるため、数値として比較する。
// 数字でない番号（数値にできないもの）は、数字の番号の後ろに文字列の順で並べる
export function sortByCode<T>(options: readonly CodeOption<T>[]): CodeOption<T>[] {
  return [...options].sort((a, b) => {
    const aNumber = Number(a.code)
    const bNumber = Number(b.code)
    const aIsNumber = a.code.trim() !== '' && Number.isFinite(aNumber)
    const bIsNumber = b.code.trim() !== '' && Number.isFinite(bNumber)
    if (aIsNumber && bIsNumber) {
      return aNumber - bNumber
    }
    if (aIsNumber !== bIsNumber) {
      return aIsNumber ? -1 : 1
    }
    return a.code.localeCompare(b.code)
  })
}
