// 現場用伝票の上部・下部に出す文の組み立てと、印刷の画面の URL（docs/screen-design.md「現場用伝票の印刷」）。
// どれも画面や DB に依存しない純粋な関数にして、テストする。

import { formatDisplayDate } from '@/lib/order-entry/date'
import type { SlipCopyKind } from './types'

// ------------------------------------------------------------
// 伝票の種類と、印刷の画面の URL
// ------------------------------------------------------------

// URL の ?copy= の値（field 現場用 / price 単価記入用）
const COPY_PARAMS: Record<SlipCopyKind, string> = { 現場用: 'field', 単価記入用: 'price' }

export const SLIP_COPY_KINDS: readonly SlipCopyKind[] = ['現場用', '単価記入用']

// URL の ?copy= を伝票の種類にする（知らない値なら現場用）
export function parseSlipCopy(value: string | string[] | undefined): SlipCopyKind {
  return value === COPY_PARAMS.単価記入用 ? '単価記入用' : '現場用'
}

// 印刷の画面の URL。auto を付けると、開いたらすぐに印刷する（登録の直後に開くとき）
export function slipPrintHref(params: { no: string; copy?: SlipCopyKind; auto?: boolean }): string {
  const search = new URLSearchParams({ no: params.no })
  if (params.copy && params.copy !== '現場用') search.set('copy', COPY_PARAMS[params.copy])
  if (params.auto) search.set('auto', '1')
  return `/orders/print?${search.toString()}`
}

// ------------------------------------------------------------
// 上部の項目
// ------------------------------------------------------------

// 納期。確定・仮納期は日付を出す（仮納期も印字するため、手書きは要らない）。後報・最短出荷は日付を持たない
export function dueDateText(dueDateType: string, dueDate: string | null): string {
  if (dueDate && (dueDateType === '確定' || dueDateType === '仮納期')) {
    const date = formatDisplayDate(dueDate)
    return dueDateType === '仮納期' ? `${date}（仮納期）` : date
  }
  return dueDateType
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
