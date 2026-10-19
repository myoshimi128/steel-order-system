// 未読の通知を読む（サーバー側から呼ぶ。共通レイアウトと、すべて既読にする Server Action で使う）。
//
// 未読 = 自分の部署の通知のうち、自分の既読（notification_reads）の行がないもの。
//   ・自分の部署の行だけになるのは、notifications の RLS（notifications_select_own_dept）による
//   ・notification_reads(notification_id) は、既読の行を一緒に取る書き方。RLS で自分の行しか見えないため、
//     「自分の既読」だけがついてくる
//   ・.is('notification_reads', null) で「既読の行がついていない通知」だけに絞る（Supabase の Data API の書き方で、
//     一緒に取った行がないものを選ぶ）

import { createClient } from '@/lib/supabase-server'
import { toNotificationItem, type NotificationItem } from './types'

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

// 未読の通知を新しい順に limit 件と、未読の総数を返す
export async function fetchUnreadNotifications(
  supabase: SupabaseClient,
  limit: number
): Promise<{ items: NotificationItem[]; count: number }> {
  const { data, count, error } = await supabase
    .from('notifications')
    // count: 'exact' で、limit とは別に条件に合う行の総数も返してもらう（ベルの未読の数に使う）
    .select('id, kind, title, body, intake_id, created_at, notification_reads(notification_id)', {
      count: 'exact',
    })
    .is('notification_reads', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(`通知を読めませんでした: ${error.message}`)

  return { items: data.map(toNotificationItem), count: count ?? data.length }
}
