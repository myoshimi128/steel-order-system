// ホームの上部のあいさつと日付（docs/intake/screen-design.md「S-01 ホーム」）。
// サーバー（UTC）で実行しても日本の時刻で判定するよう、タイムゾーンを指定して求める。

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

// 日本時間の年・月・日・時・曜日を取り出す
function japanParts(now: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  // en-US の曜日は 'Sun'〜'Sat'。日本語の曜日に直すため、番号に置き換える
  const weekdayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    // hour12: false でも、0 時が「24」になる環境があるため 24 で割った余りにする
    hour: Number(get('hour')) % 24,
    weekday: WEEKDAYS[weekdayIndex] ?? '',
  }
}

// 時刻に合わせたあいさつ。
// 5 時〜10 時台は「おはようございます」、11 時〜16 時台は「こんにちは」、それ以外は「こんばんは」
export function greetingFor(now: Date): string {
  const { hour } = japanParts(now)
  if (hour >= 5 && hour < 11) return 'おはようございます'
  if (hour >= 11 && hour < 17) return 'こんにちは'
  return 'こんばんは'
}

// 「2026年10月19日（月）」の形の今日の日付
export function formatJapaneseDate(now: Date): string {
  const { year, month, day, weekday } = japanParts(now)
  return `${year}年${month}月${day}日（${weekday}）`
}
