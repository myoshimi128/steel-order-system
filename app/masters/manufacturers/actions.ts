'use server'

// メーカーマスタの登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（manufacturers_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isDigitsOnly } from '@/lib/master-number'
import { NO_MANUFACTURER_CODE } from '@/lib/order-entry/constants'
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
  // 受注登録画面でテンキーだけで入力できるよう、コードは数字のみとする
  // （DB 側でも manufacturers_code_digits_check で同じ制限をかけている）
  if (!isDigitsOnly(code.trim())) {
    return { ok: false, error: 'メーカーコードは数字のみで入力してください' }
  }
  // 「0」は受注登録画面の「0 指定なし」に使うため、メーカーのコードにはできない
  // （DB 側でも manufacturers_code_not_zero_check で同じ制限をかけている）
  if (code.trim() === NO_MANUFACTURER_CODE) {
    return { ok: false, error: '「0」は「指定なし」に使うため、メーカーコードにはできません' }
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: 'メーカー名を入力してください' }
  }

  return {
    ok: true,
    values: { code: code.trim(), name: name.trim() },
  }
}

// コードの一意制約（manufacturers_code_key）に違反したときだけ、分かりやすいメッセージにする。
// 23505 = unique_violation
function errorMessage(error: { code?: string; message?: string }, action: string): string {
  if (error.code === '23505') {
    return 'このメーカーコードは既に使われています'
  }
  return `${action}に失敗しました: ${error.message}`
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
    return { error: errorMessage(error, '登録') }
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
    return { error: errorMessage(error, '更新') }
  }

  revalidatePath('/masters/manufacturers')
  redirect('/masters/manufacturers')
}
