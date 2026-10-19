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
