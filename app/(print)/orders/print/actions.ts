'use server'

// 現場用伝票の印刷の Server Action（docs/screen-design.md「現場用伝票の印刷」）。
//
//   recordSlipPrint: 印刷したことを記録し、その受注で何回目の印刷かを返す（DB の関数 record_order_slip_print）
//
// 印刷の画面で「印刷」を押したとき（登録の直後に自動で印刷するときも含む）に、ブラウザの印刷の画面を出す前に呼ぶ。
// 返ってきた回数を伝票の「発行 n 回目」に出してから印刷する。
// 印刷できるのは事務・管理者だけ（DB の関数の中でも確かめる）。削除した受注は印刷できない。

import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type RecordSlipPrintResult = { ok: true; count: number } | { ok: false; message: string }

export async function recordSlipPrint(orderId: string): Promise<RecordSlipPrintResult> {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return { ok: false, message: '伝票を印刷する権限がありません' }
  }
  if (!UUID_PATTERN.test(orderId)) return { ok: false, message: '受注が正しくありません' }

  const supabase = await createClient()
  const { data: count, error } = await supabase.rpc('record_order_slip_print', { p_order_id: orderId })
  if (error || count === null) {
    if (error?.message.includes('ORDER_DELETED')) return { ok: false, message: '削除された受注は印刷できません' }
    if (error?.message.includes('ORDER_NOT_FOUND')) return { ok: false, message: '受注が見つかりません' }
    return { ok: false, message: `印刷を記録できませんでした: ${error?.message ?? '不明なエラー'}` }
  }
  // 受注No. で呼び出す画面の「前回の印刷の後に変更」の表示などを作り直す
  revalidatePath('/', 'layout')
  return { ok: true, count }
}
