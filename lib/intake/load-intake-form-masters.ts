// 受付登録の画面（S-04c）で使うマスタを、サーバーで読む。
// 受注情報と同じもの（売り先・入れ先・配達・加工場所。loadHeaderMasters）に、担当者（社員）の選択肢を足す。

import type { SupabaseClient } from '@supabase/supabase-js'
import { sortByCode, type CodeOption } from '@/lib/code-input/code-option'
import type { Database } from '@/lib/database.types'
import { loadHeaderMasters } from '@/lib/order-entry/load-order-entry-masters'
import type { IntakeFormMasters } from './intake-form'

export async function loadIntakeFormMasters(supabase: SupabaseClient<Database>): Promise<IntakeFormMasters> {
  const [header, users] = await Promise.all([
    loadHeaderMasters(supabase),
    // 担当者は社員No. で打つ。使用中のユーザーだけを選択肢にする（users はログインしていれば誰でも読める）
    supabase.from('users').select('id, employee_no, name').eq('is_active', true),
  ])
  if (users.error) throw new Error(`ユーザーを読めませんでした: ${users.error.message}`)

  return {
    ...header,
    staff: sortByCode(
      users.data.map((row): CodeOption<string> => ({ code: row.employee_no, label: row.name, value: row.id }))
    ),
  }
}
