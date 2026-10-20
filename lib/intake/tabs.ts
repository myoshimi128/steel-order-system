// 受付待ち一覧（S-04a）のタブと、一覧の上に出すお知らせ（docs/intake/screen-design.md「S-04a 受付待ち一覧」）。
//
// タブは URL の ?tab= で切り替える（再読み込み・戻るでも同じタブが開くように）。
//   受付待ち（waiting）/ 受付登録済（registered ＝ 振り分け待ち）/ 見積・ミルシート（estimate）/ 対象外（excluded）
// 受付登録・変更・削除のあとは、一覧に戻って ?notice= と ?no= で結果を知らせる。

import type { IntakeStatus } from './constants'

export type IntakeTab = Extract<IntakeStatus, 'waiting' | 'registered' | 'estimate' | 'excluded'>

export const INTAKE_TABS: readonly { tab: IntakeTab; label: string; showCount: boolean }[] = [
  { tab: 'waiting', label: '受付待ち', showCount: true },
  { tab: 'registered', label: '受付登録済', showCount: true },
  { tab: 'estimate', label: '見積・ミルシート', showCount: false },
  { tab: 'excluded', label: '対象外', showCount: false },
]

// URL の値をタブにする。知らない値・指定なしは受付待ち
export function parseIntakeTab(value: string | string[] | undefined): IntakeTab {
  const found = INTAKE_TABS.find((item) => item.tab === value)
  return found ? found.tab : 'waiting'
}

// 一覧の URL を作る（タブ・選んだ行・お知らせ）
export function intakeListHref(params: {
  tab?: IntakeTab
  selected?: string | null
  notice?: IntakeNotice
  no?: string | null
}): string {
  const search = new URLSearchParams()
  if (params.tab && params.tab !== 'waiting') search.set('tab', params.tab)
  if (params.selected) search.set('selected', params.selected)
  if (params.notice) search.set('notice', params.notice)
  if (params.no) search.set('no', params.no)
  const query = search.toString()
  return query === '' ? '/intake' : `/intake?${query}`
}

// 一覧の上に出すお知らせの種類
export type IntakeNotice = 'registered' | 'updated' | 'deleted' | 'estimate' | 'dispatched'

// お知らせの文。知らない値なら null
export function intakeNoticeText(
  notice: string | string[] | undefined,
  no: string | string[] | undefined
): string | null {
  const intakeNo = typeof no === 'string' && no !== '' ? no : null
  const label = intakeNo ? `受付No. ${intakeNo} ` : ''
  switch (notice) {
    case 'registered':
      return `${label}を発行して受付登録しました`
    case 'updated':
      return `${label}の変更を保存しました`
    case 'deleted':
      return `${label}を削除しました`
    case 'estimate':
      return `${label}を発行して見積・ミルシートに区分しました`
    case 'dispatched':
      return `${label}の振り分けを完了しました（先寸は受注登録待ち、アイトレは CAD へ）`
    default:
      return null
  }
}
