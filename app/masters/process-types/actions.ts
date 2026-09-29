'use server'

// 加工種別マスタの登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（process_types_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isNumberUniqueViolation, readMasterNumber } from '@/lib/master-number'
import { createClient } from '@/lib/supabase-server'

export type ProcessTypeFormState = { error: string } | undefined

type ParsedProcessTypeForm =
  | { ok: true; values: { number: number; name: string; category: string | null } }
  | { ok: false; error: string }

function readProcessTypeForm(formData: FormData): ParsedProcessTypeForm {
  // 番号は受注登録画面で加工方法を選ぶときに入力する値。
  // DB 上は NULL 可（番号のない既存行があるため）だが、画面からの登録・更新では必須にする
  const number = readMasterNumber(formData)
  if (!number.ok) {
    return number
  }

  const name = formData.get('name')
  const category = formData.get('category')

  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '加工名を入力してください' }
  }

  return {
    ok: true,
    values: {
      number: number.value,
      name: name.trim(),
      category:
        typeof category === 'string' && category.trim()
          ? category.trim()
          : null,
    },
  }
}

// 番号の一意制約違反のときだけ分かりやすいメッセージにする
function errorMessage(error: { code?: string; message?: string }, action: string): string {
  if (isNumberUniqueViolation(error)) {
    return 'この番号は既に使われています'
  }
  return `${action}に失敗しました: ${error.message}`
}

export async function createProcessType(
  _prevState: ProcessTypeFormState,
  formData: FormData
): Promise<ProcessTypeFormState> {
  const parsed = readProcessTypeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('process_types').insert(parsed.values)

  if (error) {
    return { error: errorMessage(error, '登録') }
  }

  revalidatePath('/masters/process-types')
  redirect('/masters/process-types')
}

// useActionState から呼ぶときは processTypeId をあらかじめ bind してから渡す
export async function updateProcessType(
  processTypeId: string,
  _prevState: ProcessTypeFormState,
  formData: FormData
): Promise<ProcessTypeFormState> {
  const parsed = readProcessTypeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('process_types')
    .update({ ...parsed.values, is_active: isActive })
    .eq('id', processTypeId)

  if (error) {
    return { error: errorMessage(error, '更新') }
  }

  revalidatePath('/masters/process-types')
  redirect('/masters/process-types')
}
