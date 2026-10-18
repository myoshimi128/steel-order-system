// 受付No. の入力の正規化（docs/intake/screen-design.md「受注情報」の入力の決まり）。
//
// 受付No. は YY-NNNN（例: 26-1003）。DB の private.assign_intake_no() が採番する形と同じ。
//   ・YY  : 採番した年の下 2 桁
//   ・NNNN: その年の連番。4 桁に 0 を埋める。10000 件目からは桁が増える（26-10000）
//
// 受付登録の「1 変更」「2 削除」や受注登録待ちに追加の画面で、受付No. をテンキーで打って呼び出す。
// 打ち方がそろわなくても同じ受付を指せるよう、次の打ち方を YY-NNNN にそろえる。
//   26-1003 → 26-1003（そのまま）
//   26-1    → 26-0001（ハイフンの後の連番は 0 を埋める）
//   261003  → 26-1003（ハイフンなし。先頭 2 桁を年、残りを連番とみなす）
//   26 1003 → 26-1003（空白で区切ってもよい）
// 形にならない入力（数字以外を含む・桁が足りない・連番が 0 など）は null を返す。

// 年の桁数と、連番を 0 で埋める桁数
const YEAR_DIGITS = 2
const SEQ_PAD_DIGITS = 4

// 年と連番から受付No. の文字列を作る（連番は 4 桁に 0 埋め）
export function formatIntakeNo(year: number, seq: number): string {
  // padStart は、指定の長さになるまで先頭に文字を足す（10000 以上はそのまま）
  return `${String(year % 100).padStart(YEAR_DIGITS, '0')}-${String(seq).padStart(SEQ_PAD_DIGITS, '0')}`
}

// 打った受付No. を YY-NNNN にそろえる。形にならなければ null
export function normalizeIntakeNo(input: string): string | null {
  const text = input.trim()

  // 区切り（ハイフンまたは空白）がある打ち方: 「年 区切り 連番」に分ける。
  // [-\s]+ は「ハイフンか空白が 1 つ以上」。年は 2 桁ちょうど、連番は 1 桁以上
  const separated = /^(\d{2})[-\s]+(\d+)$/.exec(text)
  if (separated) {
    return buildIntakeNo(separated[1], separated[2])
  }

  // 区切りのない打ち方: 先頭 2 桁を年、残りを連番とみなす。
  // 連番を 4 桁未満にすると「2610」が 26-0010 なのか打ちかけなのか区別できないため、連番は 4 桁以上に限る
  const joined = /^(\d{2})(\d{4,})$/.exec(text)
  if (joined) {
    return buildIntakeNo(joined[1], joined[2])
  }

  return null
}

// 年（2 桁の文字）と連番（数字の文字）から受付No. を作る。連番が 0 なら null
function buildIntakeNo(yearText: string, seqText: string): string | null {
  const seq = Number(seqText)
  // 連番は 1 から振るため、0（0000 など）は存在しない番号として扱う
  if (!Number.isSafeInteger(seq) || seq < 1) {
    return null
  }
  return `${yearText}-${String(seq).padStart(SEQ_PAD_DIGITS, '0')}`
}
