'use server'

// 大板加算マスタの登録・更新を行う Server Action。
// large_plate_extras は admin 以外に参照・書き込みとも RLS（large_plate_extras_admin_all）で
// 拒否されるため、このファイルの関数は admin 以外が呼んでも DB 側で必ず失敗する。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type LargePlateExtraFormState = { error: string } | undefined

type ParsedLargePlateExtraForm =
  | { ok: true; values: { thickness: number; extra_price: number } }
  | { ok: false; error: string }

function readLargePlateExtraForm(
  formData: FormData
): ParsedLargePlateExtraForm {
  const thicknessRaw = formData.get('thickness')
  const extraPriceRaw = formData.get('extra_price')

  const thickness =
    typeof thicknessRaw === 'string' ? Number(thicknessRaw) : NaN
  if (!Number.isFinite(thickness) || thickness <= 0) {
    return { ok: false, error: '板厚を正しく入力してください' }
  }

  const extraPrice =
    typeof extraPriceRaw === 'string' ? Number(extraPriceRaw) : NaN
  if (!Number.isFinite(extraPrice)) {
    return { ok: false, error: '加算値を正しく入力してください' }
  }

  return { ok: true, values: { thickness, extra_price: extraPrice } }
}

export async function createLargePlateExtra(
  _prevState: LargePlateExtraFormState,
  formData: FormData
): Promise<LargePlateExtraFormState> {
  const parsed = readLargePlateExtraForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('large_plate_extras')
    .insert(parsed.values)

  if (error) {
    // 23505 = unique_violation。thickness の一意制約
    if (error.code === '23505') {
      return { error: 'この板厚の大板加算は既に登録されています' }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/large-plate-extras')
  redirect('/masters/large-plate-extras')
}

// useActionState から呼ぶときは largePlateExtraId をあらかじめ bind してから渡す
export async function updateLargePlateExtra(
  largePlateExtraId: string,
  _prevState: LargePlateExtraFormState,
  formData: FormData
): Promise<LargePlateExtraFormState> {
  const parsed = readLargePlateExtraForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('large_plate_extras')
    .update(parsed.values)
    .eq('id', largePlateExtraId)

  if (error) {
    if (error.code === '23505') {
      return { error: 'この板厚の大板加算は既に登録されています' }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/large-plate-extras')
  redirect('/masters/large-plate-extras')
}
