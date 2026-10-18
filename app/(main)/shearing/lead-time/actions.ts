'use server'

// 納期連絡の「ホームに公開」の Server Action（docs/intake/screen-design.md「S-03 納期連絡」）。
// 書き込みは DB の関数 publish_lead_times（supabase/migrations/20261019110000_create_publish_lead_times.sql）で、
// 工程・部署メッセージ・更新履歴を 1 つの transaction で書く。
// 公開できるのは事務・管理者だけ。関数の中と RLS で強制しているため、ここではロールを確かめない。

import { revalidatePath } from 'next/cache'
import type { Json } from '@/lib/database.types'
import type { LeadTimeDept, LeadTimeSnapshot } from '@/lib/lead-time/types'
import { createClient } from '@/lib/supabase-server'

export type PublishLeadTimesInput = {
  dept: LeadTimeDept
  // 公開する内容（画面で確かめたもの。lib/lead-time/draft.ts の validateDraft）
  snapshot: LeadTimeSnapshot
  // 更新履歴に残す要約（lib/lead-time/summary.ts の buildLeadTimeSummary）
  summary: string
  // 画面を開いた時点の最新の更新履歴の id（ほかの人が先に公開していないかの確認に使う）
  expectedHistoryId: string | null
}

export type PublishLeadTimesResult = { ok: true } | { ok: false; error: string }

export async function publishLeadTimes(
  input: PublishLeadTimesInput
): Promise<PublishLeadTimesResult> {
  if (input.dept !== 'processing' && input.dept !== 'shearing') {
    return { ok: false, error: '部署が正しくありません' }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('publish_lead_times', {
    p_dept: input.dept,
    p_items: input.snapshot.items as Json,
    p_summary: input.summary,
    // 空の値は引数ごと省く（関数の初期値 null が使われる）
    p_message: input.snapshot.message ?? undefined,
    p_expires_on: input.snapshot.expiresOn ?? undefined,
    p_expected_history_id: input.expectedHistoryId ?? undefined,
  })

  if (error) {
    // ほかの人が先に公開していた（関数のエラーの文の先頭で見分ける）
    if (error.message.includes('LEAD_TIME_CONFLICT')) {
      return {
        ok: false,
        error:
          'ほかの人が先に公開しました。入力した内容は公開していません。画面を開き直して、最新の内容から入れ直してください。',
      }
    }
    // 23505 は一意制約の違反（同じ部署に同じ名前の工程がある）
    if (error.code === '23505') {
      return { ok: false, error: '同じ名前の工程がすでにあります' }
    }
    return { ok: false, error: `公開できませんでした: ${error.message}` }
  }

  // ホームと、この画面を作り直す（公開した内容と、新しい更新履歴を出すため）
  revalidatePath('/')
  revalidatePath('/shearing/lead-time')
  return { ok: true }
}
