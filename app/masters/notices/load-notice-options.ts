// 得意先の注意事項のフォームで使う選択肢（得意先・加工種別）を取得する。
// 新規登録・編集の両方の画面で使うため、ここにまとめる。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function loadNoticeOptions(supabase: SupabaseClient<Database>) {
  const [customers, processTypes] = await Promise.all([
    supabase.from('customers').select('id, code, name').eq('is_active', true).order('code'),
    // 番号順に並べる（番号は加工の順番）。番号のない加工種別は最後
    supabase
      .from('process_types')
      .select('id, number, name')
      .eq('is_active', true)
      .order('number', { nullsFirst: false }),
  ])
  return {
    customers: customers.data ?? [],
    processTypes: processTypes.data ?? [],
  }
}
