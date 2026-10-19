// 受付日時（手動で受付を追加の「受付日時」）の入力と表示。
//
// 日付は受注登録と同じ打ち方の欄（DateField。月日 4 桁）、時刻は 4 桁の数字（1040 → 10:40）で打つ。
// 日本の時刻として打つため、保存するときは「+09:00」を付けた日時の文字にする
// （DB の timestamptz に入れると、正しい時刻として保存される）。

import { formatShortDateTime } from '@/lib/lead-time/display'

export type ParsedTime = { ok: true; value: string } | { ok: false; error: string }

// 打った時刻を 'HH:MM' にする。「1040」「10:40」「940」「9:40」を受け付ける
export function parseTimeInput(input: string): ParsedTime {
  const text = input.trim()
  if (text === '') return { ok: false, error: '時刻を入力してください' }

  const match = /^(\d{1,2}):?(\d{2})$/.exec(text)
  if (!match) return { ok: false, error: '時刻は 4 桁（時分）で入力してください' }

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return { ok: false, error: '存在しない時刻です' }

  return { ok: true, value: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
}

// 日付 'YYYY-MM-DD' と時刻 'HH:MM' から、日本時間の日時の文字（ISO 8601）を作る
export function toJapanDateTime(date: string, time: string): string {
  return `${date}T${time}:00+09:00`
}

// 日本時間の今の時刻 'HH:MM'（受付日時の初期値）
export function nowTimeInJapan(now: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('hour')}:${get('minute')}`
}

// 一覧に出す受信日時（日本時間の「10/16 09:12」）
export function formatReceivedAt(iso: string): string {
  return formatShortDateTime(iso)
}

// メールの中身に出す受信日時（日本時間の「2026/10/16（金）09:12」）
export function formatReceivedAtLong(iso: string): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')}（${get('weekday')}）${get('hour')}:${get('minute')}`
}
