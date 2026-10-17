'use server'

// 板厚エキストラマスタの登録・更新を行う Server Action。
// thickness_extras は admin 以外に参照・書き込みとも RLS（thickness_extras_admin_all）で
// 拒否されるため、このファイルの関数は admin 以外が呼んでも DB 側で必ず失敗する。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type ThicknessExtraFormState = { error: string } | undefined

type ParsedThicknessExtraForm =
  | { ok: true; values: { thickness: number; extra_price: number } }
  | { ok: false; error: string }

function readThicknessExtraForm(
  formData: FormData
): ParsedThicknessExtraForm {
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

export async function createThicknessExtra(
  _prevState: ThicknessExtraFormState,
  formData: FormData
): Promise<ThicknessExtraFormState> {
  const parsed = readThicknessExtraForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('thickness_extras')
    .insert(parsed.values)

  if (error) {
    // 23505 = unique_violation。thickness の一意制約
    if (error.code === '23505') {
      return { error: 'この板厚の板厚エキストラは既に登録されています' }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/thickness-extras')
  redirect('/masters/thickness-extras')
}

// useActionState から呼ぶときは thicknessExtraId をあらかじめ bind してから渡す
export async function updateThicknessExtra(
  thicknessExtraId: string,
  _prevState: ThicknessExtraFormState,
  formData: FormData
): Promise<ThicknessExtraFormState> {
  const parsed = readThicknessExtraForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('thickness_extras')
    .update(parsed.values)
    .eq('id', thicknessExtraId)

  if (error) {
    if (error.code === '23505') {
      return { error: 'この板厚の板厚エキストラは既に登録されています' }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/thickness-extras')
  redirect('/masters/thickness-extras')
}
