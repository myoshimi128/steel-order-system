// CAD の作業中の行に出す「作業を始めてからの経過時間」と、長く作業中のままかの判定
// （docs/intake/screen-design.md「S-05 CAD」の「CSV の入れ忘れに気づけるようにする」）。
//
// CAD の作業は終わったのに CSV を入れ忘れて、作業中のまま残っていることがあるため、
// 経過時間を出し、CAD_LONG_RUNNING_HOURS（lib/intake/constants.ts）以上たった行を目立たせる。
// 今の時刻は引数で受け取る（関数の中で new Date() を読まないので、テストで時刻を決められる）。

import { CAD_LONG_RUNNING_HOURS } from './constants'

const MINUTE_MS = 60 * 1000

// 作業開始からの経過（分。端数は切り捨て）。開始が今より後（パソコンの時計のずれなど）なら 0
export function elapsedMinutes(startedAt: string, now: Date): number {
  const diff = now.getTime() - new Date(startedAt).getTime()
  return diff > 0 ? Math.floor(diff / MINUTE_MS) : 0
}

// 経過の表示。1 時間未満は「15分」、1 日未満は「3時間20分」、1 日以上は「1日4時間」（分は出さない）
export function formatElapsed(minutes: number): string {
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    const rest = minutes % 60
    return rest === 0 ? `${hours}時間` : `${hours}時間${rest}分`
  }
  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours === 0 ? `${days}日` : `${days}日${restHours}時間`
}

// 作業中のまま長くたっているか（目立たせるか）。開始日時がなければ false。
// ちょうど基準の時間になったら目立たせる（24 時間なら、開始から 24 時間 0 分で true）
export function isLongRunning(
  startedAt: string | null,
  now: Date,
  thresholdHours: number = CAD_LONG_RUNNING_HOURS
): boolean {
  if (startedAt === null) return false
  return elapsedMinutes(startedAt, now) >= thresholdHours * 60
}
