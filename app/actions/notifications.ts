'use server'

// 通知を既読にする Server Action（ヘッダーの通知ベルから呼ぶ）。
// 既読は notification_reads に自分の行を足すだけ。RLS（notification_reads_insert_own）で、
// 自分の行（user_id = 自分）しか作れない。既読を取り消す操作はない。

import { createClient } from '@/lib/supabase-server'
import { fetchUnreadNotifications } from '@/lib/notifications/queries'

export type MarkReadResult = { error: string } | undefined

// uuid の形か（画面から届いた値を、そのまま DB に渡さないため）
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 既読の行を作る。同じ通知をすでに既読にしていたら何もしない
// （ignoreDuplicates: 主キーが重なる行は「足さずに飛ばす」。insert ... on conflict do nothing と同じ）
async function insertReads(notificationIds: string[]): Promise<MarkReadResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインし直してください' }

  const { error } = await supabase.from('notification_reads').upsert(
    notificationIds.map((id) => ({ notification_id: id, user_id: user.id })),
    { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
  )
  if (error) return { error: `既読にできませんでした: ${error.message}` }
  return undefined
}

// 1 件を既読にする
export async function markNotificationRead(notificationId: string): Promise<MarkReadResult> {
  if (!UUID_PATTERN.test(notificationId)) return { error: '通知が正しくありません' }
  return insertReads([notificationId])
}

// 未読をすべて既読にする。
// ベルの一覧には新しい 20 件しか持っていないため、画面から id を受け取らず、ここで未読をすべて読み直す
export async function markAllNotificationsRead(): Promise<MarkReadResult> {
  const supabase = await createClient()
  let ids: string[]
  try {
    // Data API は 1 回に 1000 行まで返す。1000 件を超える未読は、もう一度押せば既読になる
    const { items } = await fetchUnreadNotifications(supabase, 1000)
    ids = items.map((item) => item.id)
  } catch (error) {
    return { error: error instanceof Error ? error.message : '通知を読めませんでした' }
  }
  if (ids.length === 0) return undefined
  return insertReads(ids)
}

// 1 つの受付の通知を、すべて既読にする（受付待ち一覧で行を選んだとき。一覧の NEW の印を消す）。
// 既読にした通知の id を返す（画面のベルの未読の数を、その分だけ減らすため）
export async function markIntakeNotificationsRead(
  intakeId: string
): Promise<{ ids: string[] } | { error: string }> {
  if (!UUID_PATTERN.test(intakeId)) return { error: '受付が正しくありません' }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, notification_reads(notification_id)')
    .eq('intake_id', intakeId)
    .is('notification_reads', null)
  if (error) return { error: `通知を読めませんでした: ${error.message}` }

  const ids = data.map((row) => row.id)
  if (ids.length === 0) return { ids }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'ログインし直してください' }

  // 既読の行を作り、実際に作れた行の通知の id だけを返してもらう。
  // ignoreDuplicates（すでに既読の行は飛ばす）と .select() を組み合わせると、飛ばした行は返ってこない。
  // 通知を押した直後など、ほかの操作で同じ通知を既読にしていたときに、ベルの未読の数を 2 回減らさないため
  const { data: inserted, error: insertError } = await supabase
    .from('notification_reads')
    .upsert(
      ids.map((id) => ({ notification_id: id, user_id: user.id })),
      { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
    )
    .select('notification_id')
  if (insertError) return { error: `既読にできませんでした: ${insertError.message}` }
  return { ids: inserted.map((row) => row.notification_id) }
}
