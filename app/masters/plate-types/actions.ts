'use server'

// 種類マスタ（普通板・縞板・ボンデ・ミガキ）の登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（plate_types_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type PlateTypeFormState = { error: string } | undefined

type ParsedPlateTypeForm =
  | { ok: true; values: { name: string } }
  | { ok: false; error: string }

// applies_material_extra・is_active はチェックボックスなので、
// is_active と同様に各関数側で直接 FormData から読む（未チェック時は key 自体が
// 送られてこないため、共通のバリデーション対象にする必要がない）
function readPlateTypeForm(formData: FormData): ParsedPlateTypeForm {
  const name = formData.get('name')

  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '種類名を入力してください' }
  }

  return { ok: true, values: { name: name.trim() } }
}

export async function createPlateType(
  _prevState: PlateTypeFormState,
  formData: FormData
): Promise<PlateTypeFormState> {
  const parsed = readPlateTypeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const appliesMaterialExtra = formData.get('applies_material_extra') === 'on'

  const supabase = await createClient()
  const { error } = await supabase.from('plate_types').insert({
    name: parsed.values.name,
    applies_material_extra: appliesMaterialExtra,
  })

  if (error) {
    // 23505 = unique_violation。plate_types.name の一意制約
    if (error.code === '23505') {
      return { error: 'この種類名は既に登録されています' }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/plate-types')
  redirect('/masters/plate-types')
}

// useActionState から呼ぶときは plateTypeId をあらかじめ bind してから渡す
export async function updatePlateType(
  plateTypeId: string,
  _prevState: PlateTypeFormState,
  formData: FormData
): Promise<PlateTypeFormState> {
  const parsed = readPlateTypeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const appliesMaterialExtra = formData.get('applies_material_extra') === 'on'
  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('plate_types')
    .update({
      name: parsed.values.name,
      applies_material_extra: appliesMaterialExtra,
      is_active: isActive,
    })
    .eq('id', plateTypeId)

  if (error) {
    if (error.code === '23505') {
      return { error: 'この種類名は既に登録されています' }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/plate-types')
  redirect('/masters/plate-types')
}
