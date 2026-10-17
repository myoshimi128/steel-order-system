'use server'

// スタンプマスタ（雨濡れ厳禁・急ぎ など、現場用伝票に印字する文言）の登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（stamps_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isNumberUniqueViolation, readMasterNumber } from '@/lib/master-number'
import { createClient } from '@/lib/supabase-server'

export type StampFormState = { error: string } | undefined

type ParsedStampForm =
  | { ok: true; values: { number: number; body: string } }
  | { ok: false; error: string }

function readStampForm(formData: FormData): ParsedStampForm {
  // 番号は受注登録画面でスタンプを付け外しするときに打つ値。並び順にも使う
  const number = readMasterNumber(formData)
  if (!number.ok) {
    return number
  }
  // 0 は「いつもの値」に取っておく考え方のため、スタンプの番号は 1 から（DB の stamps_number_check と同じ）
  if (number.value < 1) {
    return { ok: false, error: '番号は 1 以上で入力してください' }
  }

  const body = formData.get('body')
  if (typeof body !== 'string' || !body.trim()) {
    return { ok: false, error: '文言を入力してください' }
  }

  return { ok: true, values: { number: number.value, body: body.trim() } }
}

// 番号の一意制約違反のときだけ分かりやすいメッセージにする
function errorMessage(error: { code?: string; message?: string }, action: string): string {
  if (isNumberUniqueViolation(error)) {
    return 'この番号は既に使われています'
  }
  return `${action}に失敗しました: ${error.message}`
}

export async function createStamp(
  _prevState: StampFormState,
  formData: FormData
): Promise<StampFormState> {
  const parsed = readStampForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('stamps').insert(parsed.values)

  if (error) {
    return { error: errorMessage(error, '登録') }
  }

  revalidatePath('/masters/stamps')
  redirect('/masters/stamps')
}

// useActionState から呼ぶときは stampId をあらかじめ bind してから渡す
export async function updateStamp(
  stampId: string,
  _prevState: StampFormState,
  formData: FormData
): Promise<StampFormState> {
  const parsed = readStampForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('stamps')
    .update({ ...parsed.values, is_active: formData.get('is_active') === 'on' })
    .eq('id', stampId)

  if (error) {
    return { error: errorMessage(error, '更新') }
  }

  revalidatePath('/masters/stamps')
  redirect('/masters/stamps')
}
