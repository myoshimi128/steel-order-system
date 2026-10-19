// 目安納期の表示に使う判定と書式（ホームのカード・納期連絡のプレビューで共通）。

import type { LeadTimeItem } from './types'

// 部署メッセージを表示するか。
// 表示期限（expires_on）の日までは表示し、次の日から表示しない。期限が空なら表示し続ける。
// 日付はどちらも 'YYYY-MM-DD' の形のため、文字列のまま大小を比べられる
export function isMessageVisible(
  message: string | null,
  expiresOn: string | null,
  today: string
): boolean {
  if (!message || message.trim() === '') return false
  if (expiresOn === null) return true
  return expiresOn >= today
}

// カードに出す日数。日数の代わりに「—」を出すときは null を返す
// （混雑度が「要相談」のとき、日数がまだ入っていないとき）
export function displayDays(item: Pick<LeadTimeItem, 'days' | 'congestion'>): number | null {
  if (item.congestion === 'consult') return null
  return item.days
}

// 日時を日本時間の「10/16 08:15」の形にする（カードの「更新 10/16 08:15」・更新履歴・通知の日時）。
// サーバー（UTC）で実行しても日本の時刻になるよう、タイムゾーンを指定する
export function formatShortDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  // formatToParts は「月」「日」などを部品ごとに返す。必要な部品だけ取り出して並べ直す
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`
}
