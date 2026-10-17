'use server'

// 得意先の注意事項マスタ（notices）の登録・更新を行う Server Action。
// 得意先（必須）・切断方法・加工種別のうち、指定した条件がすべて受注に当てはまったら、
// 受注登録画面の補助エリアに表示する（docs/basic-design.md「注意事項の表示」）。
// 書き込み権限そのものは RLS（notices_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { readInteger, readOptionalText } from '@/lib/master-form'
import { NOTICE_CUTTING_METHODS } from '@/lib/order-entry/notices'
import type { CuttingMethod } from '@/lib/pricing/types'
import { createClient } from '@/lib/supabase-server'

export type NoticeFormState = { error: string } | undefined

type ParsedNoticeForm =
  | {
      ok: true
      values: {
        customer_id: string
        cutting_method: CuttingMethod | null
        process_type_id: string | null
        body: string
        priority: number
      }
    }
  | { ok: false; error: string }

function isCuttingMethod(value: string): value is CuttingMethod {
  return (NOTICE_CUTTING_METHODS as readonly string[]).includes(value)
}

function readNoticeForm(formData: FormData): ParsedNoticeForm {
  const customerId = readOptionalText(formData, 'customer_id')
  if (!customerId) {
    return { ok: false, error: '得意先を選択してください' }
  }

  // 切断方法・加工種別は任意（「指定なし」は空欄で送られる）
  const cuttingMethod = readOptionalText(formData, 'cutting_method')
  if (cuttingMethod !== null && !isCuttingMethod(cuttingMethod)) {
    return { ok: false, error: '切断方法が正しくありません' }
  }

  const body = readOptionalText(formData, 'body')
  if (!body) {
    return { ok: false, error: '本文を入力してください' }
  }

  const priority = readInteger(formData, 'priority', '表示順', 0)
  if (!priority.ok) {
    return priority
  }

  return {
    ok: true,
    values: {
      customer_id: customerId,
      cutting_method: cuttingMethod,
      process_type_id: readOptionalText(formData, 'process_type_id'),
      body,
      priority: priority.value,
    },
  }
}

export async function createNotice(
  _prevState: NoticeFormState,
  formData: FormData
): Promise<NoticeFormState> {
  const parsed = readNoticeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('notices').insert(parsed.values)

  if (error) {
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/notices')
  redirect('/masters/notices')
}

// useActionState から呼ぶときは noticeId をあらかじめ bind してから渡す
export async function updateNotice(
  noticeId: string,
  _prevState: NoticeFormState,
  formData: FormData
): Promise<NoticeFormState> {
  const parsed = readNoticeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('notices')
    .update({ ...parsed.values, is_active: formData.get('is_active') === 'on' })
    .eq('id', noticeId)

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/notices')
  redirect('/masters/notices')
}
