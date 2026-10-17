'use server'

// 単位質量マスタ（縞板の重量計算用。種類×メーカー×板厚）の登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（unit_weights_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type UnitWeightFormState = { error: string } | undefined

type ParsedUnitWeightForm =
  | {
      ok: true
      values: {
        plate_type_id: string
        manufacturer_id: string
        thickness: number
        unit_weight: number
      }
    }
  | { ok: false; error: string }

function readUnitWeightForm(formData: FormData): ParsedUnitWeightForm {
  const plateTypeId = formData.get('plate_type_id')
  const manufacturerId = formData.get('manufacturer_id')
  const thicknessRaw = formData.get('thickness')
  const unitWeightRaw = formData.get('unit_weight')

  if (typeof plateTypeId !== 'string' || !plateTypeId) {
    return { ok: false, error: '種類を選択してください' }
  }
  if (typeof manufacturerId !== 'string' || !manufacturerId) {
    return { ok: false, error: 'メーカーを選択してください' }
  }

  const thickness =
    typeof thicknessRaw === 'string' ? Number(thicknessRaw) : NaN
  if (!Number.isFinite(thickness) || thickness <= 0) {
    return { ok: false, error: '板厚を正しく入力してください' }
  }

  const unitWeight =
    typeof unitWeightRaw === 'string' ? Number(unitWeightRaw) : NaN
  if (!Number.isFinite(unitWeight) || unitWeight <= 0) {
    return { ok: false, error: '単位質量を正しく入力してください' }
  }

  return {
    ok: true,
    values: {
      plate_type_id: plateTypeId,
      manufacturer_id: manufacturerId,
      thickness,
      unit_weight: unitWeight,
    },
  }
}

export async function createUnitWeight(
  _prevState: UnitWeightFormState,
  formData: FormData
): Promise<UnitWeightFormState> {
  const parsed = readUnitWeightForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('unit_weights').insert(parsed.values)

  if (error) {
    // 23505 = unique_violation。plate_type_id + manufacturer_id + thickness の一意制約
    if (error.code === '23505') {
      return {
        error: '同じ条件（種類・メーカー・板厚）の単位質量が既に登録されています',
      }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/unit-weights')
  redirect('/masters/unit-weights')
}

// useActionState から呼ぶときは unitWeightId をあらかじめ bind してから渡す
export async function updateUnitWeight(
  unitWeightId: string,
  _prevState: UnitWeightFormState,
  formData: FormData
): Promise<UnitWeightFormState> {
  const parsed = readUnitWeightForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('unit_weights')
    .update({ ...parsed.values, is_active: isActive })
    .eq('id', unitWeightId)

  if (error) {
    if (error.code === '23505') {
      return {
        error: '同じ条件（種類・メーカー・板厚）の単位質量が既に登録されています',
      }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/unit-weights')
  redirect('/masters/unit-weights')
}
