// CAD（S-05）の一覧のタブ・並び順・表示の文（docs/intake/screen-design.md「S-05 CAD」）。
//
// タブは 2 段。上は加工場所（営業所）のタブで URL の ?site=（lib/intake/site-tabs.ts。受注登録待ちと共通）、
// その下が作業の状態のタブで ?tab=。選んだ行は ?unit= に持つ（再読み込み・戻るでも同じ行が開くように）。
// 加工場所のタブの件数は作業待ち・作業中の件数で、サイドメニューの「CAD」のバッジ（ユーザーの営業所の件数）とそろう。
//   ・作業待ち・作業中（active）: CAD 作業待ち・作業中のアイトレ。並び順は「至急 → 納期 → 日付なし → 受付登録の古い順」
//   ・CSV 登録済（csv）        : CSV を登録して受注登録待ちに入ったアイトレ（起票前）。登録が新しい順
//     （CSV の入れ間違いに気づいて直すときに、直前に登録したものを探しやすくするため）

import type { DueDateType } from '@/lib/order-entry/constants'
import { sortByQueueOrder } from './sort'
import type { CadUnit } from './types'

export type CadTab = 'active' | 'csv'

export const CAD_TABS: readonly { tab: CadTab; label: string }[] = [
  { tab: 'active', label: '作業待ち・作業中' },
  { tab: 'csv', label: 'CSV 登録済' },
]

// URL の値をタブにする。知らない値・指定なしは作業待ち・作業中
export function parseCadTab(value: string | string[] | undefined): CadTab {
  return value === 'csv' ? 'csv' : 'active'
}

// CAD の一覧の URL を作る（加工場所のタブ・状態のタブ・選んだ行）
export function cadHref(params: { site?: string | null; tab?: CadTab; unit?: string | null }): string {
  const search = new URLSearchParams()
  if (params.site) search.set('site', params.site)
  if (params.tab && params.tab !== 'active') search.set('tab', params.tab)
  if (params.unit) search.set('unit', params.unit)
  const query = search.toString()
  return query === '' ? '/cad' : `/cad?${query}`
}

// 加工区分がどちらのタブに出るか
export function cadTabOf(unit: Pick<CadUnit, 'status'>): CadTab {
  return unit.status === 'ready' ? 'csv' : 'active'
}

// 加工場所のタブの行（その営業所のアイトレだけ）
export function cadUnitsForSite<T extends Pick<CadUnit, 'siteId'>>(units: readonly T[], siteId: string | null): T[] {
  return units.filter((unit) => unit.siteId === siteId)
}

// 加工場所のタブの件数（営業所ごとの作業待ち・作業中の件数。サイドメニューのバッジと同じ数え方）
export function countActiveCadBySite(units: readonly Pick<CadUnit, 'siteId' | 'status'>[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const unit of units) {
    if (unit.siteId === null || cadTabOf(unit) !== 'active') continue
    counts.set(unit.siteId, (counts.get(unit.siteId) ?? 0) + 1)
  }
  return counts
}

// 状態のタブの件数
export function countCadTabs(units: readonly Pick<CadUnit, 'status'>[]): Record<CadTab, number> {
  const counts: Record<CadTab, number> = { active: 0, csv: 0 }
  for (const unit of units) counts[cadTabOf(unit)] += 1
  return counts
}

// 新しい順に比べる（null は最後）
function newestFirst(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a > b ? -1 : 1
}

// タブに出す行を、タブの並び順で返す
export function rowsForCadTab<T extends CadUnit>(units: readonly T[], tab: CadTab): T[] {
  const rows = units.filter((unit) => cadTabOf(unit) === tab)
  return tab === 'active' ? sortByQueueOrder(rows) : [...rows].sort((a, b) => newestFirst(a.readyAt, b.readyAt))
}

// 検索（受付No.・売り先・工事名に、打った文字が含まれる行だけにする。大文字と小文字は区別しない）
export function filterCadUnits<T extends CadUnit>(units: readonly T[], query: string): T[] {
  const keyword = query.trim().toLowerCase()
  if (keyword === '') return [...units]
  return units.filter((unit) =>
    [unit.intakeNo, unit.customerName, unit.projectName]
      .filter((text): text is string => text !== null)
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  )
}

// 状態の列の文（画面イメージ 05 の「CAD未着手」「CAD作業中」）
export function cadStatusLabel(status: CadUnit['status']): string {
  switch (status) {
    case 'cad_waiting':
      return 'CAD 未着手'
    case 'cad_working':
      return 'CAD 作業中'
    case 'ready':
      return 'CSV 登録済'
  }
}

// 一覧の納期の列（日付があれば「10/03」、なければ種別「後報」など。どちらもなければ「—」）
export function shortDueDateText(dueDateType: DueDateType | null, dueDate: string | null): string {
  if (dueDate) return `${dueDate.slice(5, 7)}/${dueDate.slice(8, 10)}`
  return dueDateType ?? '—'
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

// 右のパネルの納期（「2026/10/03（土）宵積み」。日付がなければ種別と配達）
export function longDueDateText(
  dueDateType: DueDateType | null,
  dueDate: string | null,
  deliveryMethodName: string | null
): string {
  let date: string
  if (dueDate) {
    const [year, month, day] = dueDate.split('-').map(Number)
    // 日付だけの計算なので、時差の影響を受けないよう UTC の日付として曜日を求める
    const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
    date = `${dueDate.replaceAll('-', '/')}（${weekday}）`
  } else {
    date = dueDateType ?? '—'
  }
  if (!deliveryMethodName) return date
  // 曜日の（）の後は詰め、種別の後は空ける（「2026/10/03（土）宵積み」「後報 宵積み」）
  return dueDate ? `${date}${deliveryMethodName}` : `${date} ${deliveryMethodName}`
}
