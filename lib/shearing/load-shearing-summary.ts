// シャーリング部の部署ホーム（S-02）の件数のカードを、サーバー（Server Component）で数える
// （docs/intake/screen-design.md「S-02 部署ホーム」）。
//
//   ・受付待ち          : 受付待ちの受付（受付登録の前は加工場所が決まっていないため、全部の営業所の分）
//   ・受注登録待ち      : ready の加工区分（ログイン中のユーザーの営業所の分。管理者は全部）
//   ・本日納期          : 今日が納期で、完了していない受注（同上）
//   ・CAD 作業待ち・作業中: 作業待ち・作業中のアイトレ（同上）
// 営業所の決め方は lib/intake/queue.ts の countScopeSiteId。
// 受付・加工区分は RLS で事務・管理者だけが読める。ほかのロールでは、受付の件数を数えず null にする（カードに「—」を出す）。
// 数えられなかった件数も null にし、画面は出す。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CurrentUser } from '@/lib/current-user'
import type { Database } from '@/lib/database.types'
import { countActiveCadUnits } from '@/lib/intake/load-cad-units'
import { countIntakes } from '@/lib/intake/load-intakes'
import { countReadyUnits } from '@/lib/intake/load-queue-units'
import { countScopeSiteId } from '@/lib/intake/queue'

type Client = SupabaseClient<Database>

export type ShearingSummary = {
  waitingIntakes: number | null
  readyUnits: number | null
  dueToday: number | null
  activeCad: number | null
}

// 失敗しても null にして続ける
async function safely(count: () => Promise<number>): Promise<number | null> {
  try {
    return await count()
  } catch (error) {
    console.error(error)
    return null
  }
}

// 今日が納期で、完了していない受注の数（論理削除した受注は数えない）
async function countDueToday(supabase: Client, today: string, siteId: string | null): Promise<number> {
  let query = supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('due_date', today)
    .neq('status', '完了')
    .is('deleted_at', null)
  if (siteId) query = query.eq('site_id', siteId)
  const { count, error } = await query
  if (error) throw new Error(`本日納期の受注を数えられませんでした: ${error.message}`)
  return count ?? 0
}

export async function loadShearingSummary(
  supabase: Client,
  user: Pick<CurrentUser, 'role' | 'siteId'>,
  today: string
): Promise<ShearingSummary> {
  const siteId = countScopeSiteId(user)
  const canReadIntakes = user.role === 'office' || user.role === 'admin'
  const intakeCount = (count: () => Promise<number>) => (canReadIntakes ? safely(count) : Promise.resolve(null))

  const [waitingIntakes, readyUnits, dueToday, activeCad] = await Promise.all([
    intakeCount(() => countIntakes(supabase, 'waiting')),
    intakeCount(() => countReadyUnits(supabase, siteId)),
    safely(() => countDueToday(supabase, today, siteId)),
    intakeCount(() => countActiveCadUnits(supabase, siteId)),
  ])
  return { waitingIntakes, readyUnits, dueToday, activeCad }
}
