// 加工の注意事項のフォームで使う加工種別の選択肢を取得する。
// 入力の形（input_shape）も取得し、穴径の範囲を入力できるか（穴の形のときだけ）の判定に使う。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

export async function loadProcessTypeOptions(supabase: SupabaseClient<Database>) {
  // 番号順に並べる（番号は加工の順番）。番号のない加工種別は最後
  const { data } = await supabase
    .from('process_types')
    .select('id, number, name, input_shape')
    .eq('is_active', true)
    .order('number', { nullsFirst: false })
  return data ?? []
}
