// 受注登録待ち（S-06a）の一覧の並び順・印の文と、件数を数える営業所の決め方
// （docs/intake/screen-design.md「S-06a 受注登録待ち一覧」）。
//
// タブは加工場所（営業所）ごと（lib/intake/site-tabs.ts。CAD と共通）。
// 並び順は CAD の作業待ちと同じ「至急 → 納期 → 日付なし → 受付登録の古い順」（lib/intake/sort.ts）。

import type { UserRole } from '@/lib/current-user'
import { WORK_UNIT_ORIGIN_LABELS } from './constants'
import { sortByQueueOrder } from './sort'
import type { QueueUnit } from './types'

// 一覧の URL を作る（タブ・結果のお知らせ）
export function queueHref(params: { site?: string | null; notice?: QueueNotice; no?: string | null } = {}): string {
  const search = new URLSearchParams()
  if (params.site) search.set('site', params.site)
  if (params.notice) search.set('notice', params.notice)
  if (params.no) search.set('no', params.no)
  const query = search.toString()
  return query === '' ? '/orders/queue' : `/orders/queue?${query}`
}

// 一覧の上に出すお知らせの種類（受注登録待ちに追加・起票完了の結果）
export type QueueNotice = 'added-sakisun' | 'added-aitore' | 'completed'

export function queueNoticeText(
  notice: string | string[] | undefined,
  no: string | string[] | undefined
): string | null {
  const label = typeof no === 'string' && no !== '' ? `受付No. ${no} ` : ''
  switch (notice) {
    case 'added-sakisun':
      return `${label}に先寸を追加しました。受注登録待ちに並びます`
    case 'added-aitore':
      return `${label}にアイトレを追加しました。CAD の作業待ちに入りました（CSV が登録されると、ここに並びます）`
    case 'completed':
      return `${label}の区分の起票を完了し、一覧から外しました`
    default:
      return null
  }
}

// タブに出す行を、並び順で返す
export function rowsForQueueSite<T extends QueueUnit>(units: readonly T[], siteId: string | null): T[] {
  return sortByQueueOrder(units.filter((unit) => unit.siteId === siteId))
}

// 検索（受付No.・売り先・工事名に、打った文字が含まれる行だけにする。大文字と小文字は区別しない）
export function filterQueueUnits<T extends QueueUnit>(units: readonly T[], query: string): T[] {
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

// 「追加」の列の文（振り分けで作られた区分は空）
export function queueOriginLabel(unit: Pick<QueueUnit, 'origin'>): string {
  return WORK_UNIT_ORIGIN_LABELS[unit.origin]
}

// サイドメニューのバッジ（受注登録・CAD）と部署ホームのカードで、件数を数える営業所。
// 管理者は全部の営業所（null）、それ以外はログイン中のユーザーの営業所。営業所が空のユーザーも全部を数える
export function countScopeSiteId(user: { role: UserRole; siteId: string | null }): string | null {
  return user.role === 'admin' ? null : user.siteId
}
