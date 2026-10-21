// 受付登録の画面（S-04c）で使うマスタを、サーバーで読む。
// 受注情報と同じもの（売り先・入れ先・配達・加工場所・担当者。loadHeaderMasters）をそのまま使う。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { loadHeaderMasters } from '@/lib/order-entry/load-order-entry-masters'
import type { IntakeFormMasters } from './intake-form'

export async function loadIntakeFormMasters(supabase: SupabaseClient<Database>): Promise<IntakeFormMasters> {
  return loadHeaderMasters(supabase)
}
