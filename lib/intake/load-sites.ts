// 加工場所のタブに出す営業所を、サーバー（Server Component）で読む（受注登録待ち・CAD・受注登録の画面の帯で使う）。
// 使っている営業所（is_active）だけを、番号の順に並べる。営業所はすべてのロールが参照できる。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { SiteTab } from './site-tabs'

export async function loadSiteTabs(supabase: SupabaseClient<Database>): Promise<SiteTab[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('id, number, code, name')
    .eq('is_active', true)
    .order('number')
  if (error) throw new Error(`営業所を読めませんでした: ${error.message}`)
  return data
}
