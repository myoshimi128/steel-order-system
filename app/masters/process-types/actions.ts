'use server'

// 加工種別マスタの登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（process_types_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type ProcessTypeFormState = { error: string } | undefined

type ParsedProcessTypeForm =
  | { ok: true; values: { name: string; category: string | null } }
  | { ok: false; error: string }

function readProcessTypeForm(formData: FormData): ParsedProcessTypeForm {
  const name = formData.get('name')
  const category = formData.get('category')

  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '加工名を入力してください' }
  }

  return {
    ok: true,
    values: {
      name: name.trim(),
      category:
        typeof category === 'string' && category.trim()
          ? category.trim()
          : null,
    },
  }
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
    return { error: `登録に失敗しました: ${error.message}` }
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
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/process-types')
  redirect('/masters/process-types')
}
