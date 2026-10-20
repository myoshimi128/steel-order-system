// 受付登録の 2 つのページ（/intake/[id] と /intake/register）で共通に読むもの:
// マスタの選択肢（売り先・入れ先・配達・加工場所・担当者）と、新規の初期値の元（今日・ログイン中のユーザー）。

import type { CurrentUser } from '@/lib/current-user'
import { todayInJapan } from '@/lib/order-entry/date'
import { createClient } from '@/lib/supabase-server'
import type { IntakeFormDefaults, IntakeFormMasters } from './intake-form'
import { loadIntakeFormMasters } from './load-intake-form-masters'

export type IntakeRegisterContext = {
  masters: IntakeFormMasters
  defaults: IntakeFormDefaults
  today: string
}

export async function loadIntakeRegisterContext(user: CurrentUser): Promise<IntakeRegisterContext> {
  const supabase = await createClient()
  const masters = await loadIntakeFormMasters(supabase)
  // 今日の日付はサーバー（日本時間）で求めて渡す。ブラウザで求めると、サーバーの描画と日付がずれることがあるため
  const today = todayInJapan()
  return { masters, today, defaults: { today, userId: user.id, userSiteId: user.siteId } }
}
