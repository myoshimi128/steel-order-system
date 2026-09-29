'use server'

// 材質マスタの登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（materials_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isNumberUniqueViolation, readMasterNumber } from '@/lib/master-number'
import { createClient } from '@/lib/supabase-server'

export type MaterialFormState = { error: string } | undefined

type ParsedMaterialForm =
  | {
      ok: true
      values: {
        number: number
        name: string
        line_mark: string | null
        display_color: string | null
      }
    }
  | { ok: false; error: string }

// 一意制約違反（23505）のメッセージを、どの項目が重複したかに応じて出し分ける
function uniqueViolationMessage(error: { code?: string; message?: string }): string | null {
  if (isNumberUniqueViolation(error)) {
    return 'この番号は既に使われています'
  }
  if (error.code === '23505') {
    return 'この材質名は既に登録されています'
  }
  return null
}

// line_mark・display_color は基本材質（SS400など）では空欄になる
// （docs/table-design.md materials の説明を参照）
function readMaterialForm(formData: FormData): ParsedMaterialForm {
  // 番号は受注登録画面で材質を選ぶときに入力する値（lib/master-number.ts で共通の検証）
  const number = readMasterNumber(formData)
  if (!number.ok) {
    return number
  }

  const name = formData.get('name')
  const lineMark = formData.get('line_mark')
  const displayColor = formData.get('display_color')

  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '材質名を入力してください' }
  }

  return {
    ok: true,
    values: {
      number: number.value,
      name: name.trim(),
      line_mark:
        typeof lineMark === 'string' && lineMark.trim()
          ? lineMark.trim()
          : null,
      display_color:
        typeof displayColor === 'string' && displayColor.trim()
          ? displayColor.trim()
          : null,
    },
  }
}

export async function createMaterial(
  _prevState: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  const parsed = readMaterialForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const hasDedicatedPrice = formData.get('has_dedicated_price') === 'on'

  const supabase = await createClient()
  const { error } = await supabase.from('materials').insert({
    ...parsed.values,
    has_dedicated_price: hasDedicatedPrice,
  })

  if (error) {
    return { error: uniqueViolationMessage(error) ?? `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/materials')
  redirect('/masters/materials')
}

// useActionState から呼ぶときは materialId をあらかじめ bind してから渡す
export async function updateMaterial(
  materialId: string,
  _prevState: MaterialFormState,
  formData: FormData
): Promise<MaterialFormState> {
  const parsed = readMaterialForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const hasDedicatedPrice = formData.get('has_dedicated_price') === 'on'
  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('materials')
    .update({
      ...parsed.values,
      has_dedicated_price: hasDedicatedPrice,
      is_active: isActive,
    })
    .eq('id', materialId)

  if (error) {
    return { error: uniqueViolationMessage(error) ?? `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/materials')
  redirect('/masters/materials')
}
