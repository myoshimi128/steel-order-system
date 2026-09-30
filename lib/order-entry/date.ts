// 受注登録画面の日付の入力を扱う処理。
//
// テンキーだけで入力できるよう、日付は数字だけで入力する。
//   「1005」     → 今年の 10 月 5 日
//   「20261005」 → 2026 年 10 月 5 日
// 画面に表示するときは「2026/10/05」の形にする。
// 保存・受け渡しには 'YYYY-MM-DD'（DB の date 型と同じ形式）を使う。

export type ParsedDate = { ok: true; value: string } | { ok: false; error: string }

// 数字を 2 桁・4 桁に 0 埋めする（例: 5 → '05'）
function pad(value: number, length: number): string {
  return String(value).padStart(length, '0')
}

// 年月日が実在する日付か（2 月 30 日などを弾く）。
// Date に渡すと 2 月 30 日は 3 月 2 日に繰り上がるため、年月日が変わっていないかで判定する
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) {
    return false
  }
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

// 入力された文字列を 'YYYY-MM-DD' に変換する。
// today は「今年」を決めるための今日の日付（'YYYY-MM-DD'）。
// 表示用の「2026/10/05」や「2026-10-05」の形も受け付ける（表示中の値でそのまま Enter した場合）。
export function parseDateInput(input: string, today: string): ParsedDate {
  const text = input.trim()
  if (!text) {
    return { ok: false, error: '日付を入力してください' }
  }

  let year: number
  let month: number
  let day: number

  const withSeparator = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(text)
  if (withSeparator) {
    year = Number(withSeparator[1])
    month = Number(withSeparator[2])
    day = Number(withSeparator[3])
  } else if (/^\d{4}$/.test(text)) {
    // 月日の 4 桁（MMDD）。年は今日の年
    year = Number(today.slice(0, 4))
    month = Number(text.slice(0, 2))
    day = Number(text.slice(2, 4))
  } else if (/^\d{8}$/.test(text)) {
    // 年月日の 8 桁（YYYYMMDD）
    year = Number(text.slice(0, 4))
    month = Number(text.slice(4, 6))
    day = Number(text.slice(6, 8))
  } else {
    return { ok: false, error: '日付は 4 桁（月日）か 8 桁（年月日）で入力してください' }
  }

  if (!isValidDate(year, month, day)) {
    return { ok: false, error: '存在しない日付です' }
  }
  return { ok: true, value: `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` }
}

// 'YYYY-MM-DD' を画面表示用の 'YYYY/MM/DD' にする。空なら空のまま
export function formatDisplayDate(value: string): string {
  return value.replaceAll('-', '/')
}

// 日本時間の今日の日付を 'YYYY-MM-DD' で返す。
// サーバー（UTC）で実行しても日本の日付になるよう、タイムゾーンを指定して求める。
// 'en-CA' ロケールは日付を 'YYYY-MM-DD' の形で出力するため、それを利用している。
export function todayInJapan(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
