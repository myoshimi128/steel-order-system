// 目安納期（lead_time_items・lead_time_messages・lead_time_history）を画面で扱うための型と定数。
// docs/intake/table-design.md「目安納期」、docs/intake/screen-design.md「S-01 ホーム」「S-03 納期連絡」

import type { Congestion } from '@/lib/intake/constants'

// 目安納期を持つ部署（DB の check 制約と同じ。加工部・シャーリング部だけ）
export type LeadTimeDept = 'processing' | 'shearing'

// ホームのカードの並び順（画面イメージ 01 のとおり、加工部 → シャーリング部）
export const HOME_LEAD_TIME_DEPTS: readonly LeadTimeDept[] = ['processing', 'shearing']

// 納期連絡の部署の切り替えの並び順。入り口がシャーリング部のメニューのため、シャーリング部を先にする
export const EDITOR_LEAD_TIME_DEPTS: readonly LeadTimeDept[] = ['shearing', 'processing']

// URL の ?dept= の値から部署を決める。指定なし・正しくない値はシャーリング部にする
export function parseLeadTimeDept(value: string | string[] | undefined): LeadTimeDept {
  return value === 'processing' ? 'processing' : 'shearing'
}

// 混雑度の値か（DB からは text で返るため、画面で使う前に確かめる）
export function isCongestion(value: string): value is Congestion {
  return value === 'normal' || value === 'busy' || value === 'crowded' || value === 'consult'
}

// 工程 1 件（DB に保存済みのもの）
export type LeadTimeItem = {
  id: string
  name: string
  // 営業日。要相談・未入力は null
  days: number | null
  congestion: Congestion
  // 補足（ホームには出さない）
  note: string | null
}

// 1 つの部署の目安納期（ホームのカード 1 枚分）
export type LeadTimeBoard = {
  dept: LeadTimeDept
  items: LeadTimeItem[]
  message: string | null
  // メッセージの表示期限 'YYYY-MM-DD'（この日まで表示する）。null は期限なし
  expiresOn: string | null
  // 最後に公開した日時と人（最新の更新履歴から取る）。一度も公開していなければ null
  updatedAt: string | null
  updatedByName: string | null
}

// 更新履歴 1 行
export type LeadTimeHistoryEntry = {
  id: string
  summary: string
  changedAt: string
  changedByName: string | null
}

// 公開する内容（変更の要約を作るときの「前」と「後」にも使う）
export type LeadTimeSnapshot = {
  items: {
    // 新しく追加した工程は null
    id: string | null
    name: string
    days: number | null
    congestion: Congestion
    note: string | null
  }[]
  message: string | null
  expiresOn: string | null
}
