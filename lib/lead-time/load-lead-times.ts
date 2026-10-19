// 目安納期を DB から読む（Server Component から呼ぶ）。ホームと納期連絡の画面で使う。
// 参照の RLS は全ロール（現場もホームで見るため）。docs/intake/table-design.md「RLS・権限・Realtime・Storage」

import { createClient } from '@/lib/supabase-server'
import {
  isCongestion,
  type LeadTimeBoard,
  type LeadTimeDept,
  type LeadTimeHistoryEntry,
} from './types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// 部署ごとの最新の更新履歴（limit 件）を読む。
// users(name) は、changed_by（users への外部キー）をたどって、公開した人の名前を一緒に取る書き方
async function fetchHistory(
  supabase: SupabaseClient,
  dept: LeadTimeDept,
  limit: number
): Promise<LeadTimeHistoryEntry[]> {
  const { data, error } = await supabase
    .from('lead_time_history')
    .select('id, summary, changed_at, users(name)')
    .eq('dept', dept)
    // 同じ時刻の行があっても順番が決まるよう、id でも並べる（publish_lead_times の「最新」と同じ並べ方）
    .order('changed_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`目安納期の更新履歴を読めませんでした: ${error.message}`)

  return data.map((row) => ({
    id: row.id,
    summary: row.summary,
    changedAt: row.changed_at,
    changedByName: row.users?.name ?? null,
  }))
}

// 指定した部署の目安納期（工程・メッセージ・最後に公開した日時と人）を読む
export async function loadLeadTimeBoards(
  depts: readonly LeadTimeDept[]
): Promise<LeadTimeBoard[]> {
  const supabase = await createClient()

  // 工程・メッセージ・部署ごとの最新の履歴を、まとめて（並行して）読む
  const [itemsResult, messagesResult, ...histories] = await Promise.all([
    supabase
      .from('lead_time_items')
      .select('id, dept, name, days, congestion, note')
      .in('dept', depts)
      .order('sort_order')
      .order('name'),
    supabase.from('lead_time_messages').select('dept, message, expires_on').in('dept', depts),
    ...depts.map((dept) => fetchHistory(supabase, dept, 1)),
  ])

  if (itemsResult.error) throw new Error(`目安納期を読めませんでした: ${itemsResult.error.message}`)
  if (messagesResult.error) {
    throw new Error(`部署メッセージを読めませんでした: ${messagesResult.error.message}`)
  }

  return depts.map((dept, index) => {
    const message = messagesResult.data.find((m) => m.dept === dept)
    const latest = histories[index][0]
    return {
      dept,
      items: itemsResult.data
        .filter((item) => item.dept === dept)
        .map((item) => ({
          id: item.id,
          name: item.name,
          days: item.days,
          // congestion は DB では text 列（check 制約で値を限定）。念のため確かめ、想定外の値は「通常」として扱う
          congestion: isCongestion(item.congestion) ? item.congestion : 'normal',
          note: item.note,
        })),
      message: message?.message ?? null,
      expiresOn: message?.expires_on ?? null,
      updatedAt: latest?.changedAt ?? null,
      updatedByName: latest?.changedByName ?? null,
    }
  })
}

// 納期連絡の画面の右下に出す更新履歴（新しい順に limit 件）
export async function loadLeadTimeHistory(
  dept: LeadTimeDept,
  limit = 10
): Promise<LeadTimeHistoryEntry[]> {
  const supabase = await createClient()
  return fetchHistory(supabase, dept, limit)
}
