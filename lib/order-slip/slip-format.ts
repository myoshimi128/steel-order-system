// 現場用伝票の上部・下部に出す文の組み立てと、印刷の画面の URL（docs/screen-design.md「現場用伝票の印刷」）。
// どれも画面や DB に依存しない純粋な関数にして、テストする。

// ------------------------------------------------------------
// 印刷の画面の URL
// ------------------------------------------------------------

// 印刷の画面の URL。auto を付けると、開いたらすぐに印刷する（登録の直後に開くとき）。
// 伝票は現場用の 1 種類だけなので、種類は URL に持たない（単価は仕入入力の画面（予定）で扱う）
export function slipPrintHref(params: { no: string; auto?: boolean }): string {
  const search = new URLSearchParams({ no: params.no })
  if (params.auto) search.set('auto', '1')
  return `/orders/print?${search.toString()}`
}

// ------------------------------------------------------------
// 上部の項目
// ------------------------------------------------------------

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

// 日付（YYYY-MM-DD）を「10/30（金）」にする。年は出さない（伝票は納期の近いうちに使うため）。
// 日付だけの計算なので、時差の影響を受けないよう UTC の日付として曜日を求める（lib/intake/cad.ts と同じ）
export function monthDayWithWeekday(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${month}/${day}（${weekday}）`
}

// 伝票の上部の、納期の枠に出す内容
export type SlipDueDate = {
  // 大きく出す文。確定・仮納期は日付（10/30（金））、後報・最短出荷は種別そのもの
  main: string
  // 仮納期か（「仮」の印を付け、枠を破線にして、確定と見分けられるようにする）
  provisional: boolean
  // 配達（宵積み など）。枠の中で日付の右に並べる
  delivery: string
}

// 納期の枠の内容。確定・仮納期は日付を出す（仮納期も印字するため、手書きは要らない）。
// 後報・最短出荷は日付を持たないので、日付の代わりに種別を大きく出す
export function slipDueDate(
  dueDateType: string,
  dueDate: string | null,
  deliveryMethodName: string,
  deliveryMethodNote: string | null
): SlipDueDate {
  const dated = dueDate !== null && (dueDateType === '確定' || dueDateType === '仮納期')
  return {
    main: dated ? monthDayWithWeekday(dueDate) : dueDateType,
    provisional: dated && dueDateType === '仮納期',
    delivery: deliveryText(deliveryMethodName, deliveryMethodNote),
  }
}

// 配達。フリー（文字を入力する配達方法）は入力した文字を添える
export function deliveryText(methodName: string, note: string | null): string {
  return note ? `${methodName}（${note}）` : methodName
}

// 発行の回数の文。2 回目からは「再発行」を添えて、現場で新しい方の伝票が分かるようにする
export function issueCountText(count: number): string {
  return count >= 2 ? `発行 ${count} 回目（再発行）` : `発行 ${count} 回目`
}

// 日時を日本時間の「2026/10/23 14:05」にする
export function formatJapanDateTime(value: string): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(value))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`
}

// ------------------------------------------------------------
// 材質ラインの表示色
// ------------------------------------------------------------

// 材質マスタの表示色（display_color）は文字で登録する。よく使う色の名前（青・赤 など）は CSS の色に読み替え、
// #1e40af のような色の番号や blue のような英語の色の名前はそのまま使う。
// それ以外（読めない文字）は null にして、色の線は引かず「材質ライン：青2本」の文だけを出す
const COLOR_NAMES: Record<string, string> = {
  青: '#1d4ed8',
  赤: '#dc2626',
  緑: '#15803d',
  黄: '#ca8a04',
  黄色: '#ca8a04',
  橙: '#ea580c',
  オレンジ: '#ea580c',
  紫: '#7e22ce',
  桃: '#db2777',
  ピンク: '#db2777',
  茶: '#92400e',
  黒: '#171717',
  白: '#a3a3a3',
  灰: '#737373',
  水色: '#0284c7',
}

export function lineColorCss(displayColor: string | null): string | null {
  const text = displayColor?.trim() ?? ''
  if (text === '') return null
  // 「青色」のように「色」を付けて登録しても読めるようにする
  const named = COLOR_NAMES[text] ?? COLOR_NAMES[text.replace(/色$/, '')]
  if (named) return named
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(text)) return text
  if (/^[a-z]+$/i.test(text)) return text.toLowerCase()
  return null
}
