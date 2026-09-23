'use server'

// メーカーマスタの登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（manufacturers_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type ManufacturerFormState = { error: string } | undefined

type ParsedManufacturerForm =
  | { ok: true; values: { code: string; name: string } }
  | { ok: false; error: string }

function readManufacturerForm(formData: FormData): ParsedManufacturerForm {
  const code = formData.get('code')
  const name = formData.get('name')

  if (typeof code !== 'string' || !code.trim()) {
    return { ok: false, error: 'メーカーコードを入力してください' }
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: 'メーカー名を入力してください' }
  }

  return {
    ok: true,
    values: { code: code.trim(), name: name.trim() },
  }
}

export async function createManufacturer(
  _prevState: ManufacturerFormState,
  formData: FormData
): Promise<ManufacturerFormState> {
  const parsed = readManufacturerForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('manufacturers').insert(parsed.values)

  if (error) {
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/manufacturers')
  redirect('/masters/manufacturers')
}

// useActionState から呼ぶときは manufacturerId をあらかじめ bind してから渡す
export async function updateManufacturer(
  manufacturerId: string,
  _prevState: ManufacturerFormState,
  formData: FormData
): Promise<ManufacturerFormState> {
  const parsed = readManufacturerForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('manufacturers')
    .update({ ...parsed.values, is_active: isActive })
    .eq('id', manufacturerId)

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/manufacturers')
  redirect('/masters/manufacturers')
}
