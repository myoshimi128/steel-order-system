'use server'

// 特殊製品種別マスタ（スプライス・ササラ・ベタ丸・ドーナツ）の登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（special_product_types_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type SpecialProductTypeFormState = { error: string } | undefined

// supabase/migrations/20260924100000_replace_prices_with_pricing_tables.sql の
// check (weight_basis in (...)) と同じ値をハードコードする
const WEIGHT_BASIS_VALUES = ['実重量', '角重量', '使用材重量'] as const
type WeightBasis = (typeof WEIGHT_BASIS_VALUES)[number]

type ParsedSpecialProductTypeForm =
  | {
      ok: true
      values: {
        name: string
        weight_basis: WeightBasis
        min_weight: number | null
      }
    }
  | { ok: false; error: string }

function readSpecialProductTypeForm(
  formData: FormData
): ParsedSpecialProductTypeForm {
  const name = formData.get('name')
  const weightBasis = formData.get('weight_basis')
  const minWeightRaw = formData.get('min_weight')

  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '種別名を入力してください' }
  }

  if (
    typeof weightBasis !== 'string' ||
    !WEIGHT_BASIS_VALUES.includes(weightBasis as WeightBasis)
  ) {
    return { ok: false, error: '重量の基準を選択してください' }
  }

  // 最低保証重量は任意項目（スプライス以外は空欄のまま）
  let minWeight: number | null = null
  if (typeof minWeightRaw === 'string' && minWeightRaw.trim()) {
    minWeight = Number(minWeightRaw)
    if (!Number.isFinite(minWeight) || minWeight < 0) {
      return { ok: false, error: '最低保証重量を正しく入力してください' }
    }
  }

  return {
    ok: true,
    values: {
      name: name.trim(),
      weight_basis: weightBasis as WeightBasis,
      min_weight: minWeight,
    },
  }
}

export async function createSpecialProductType(
  _prevState: SpecialProductTypeFormState,
  formData: FormData
): Promise<SpecialProductTypeFormState> {
  const parsed = readSpecialProductTypeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const appliesThicknessExtra = formData.get('applies_thickness_extra') === 'on'
  const appliesLargePlateExtra =
    formData.get('applies_large_plate_extra') === 'on'
  const alwaysPiecePrice = formData.get('always_piece_price') === 'on'

  const supabase = await createClient()
  const { error } = await supabase.from('special_product_types').insert({
    ...parsed.values,
    applies_thickness_extra: appliesThicknessExtra,
    applies_large_plate_extra: appliesLargePlateExtra,
    always_piece_price: alwaysPiecePrice,
  })

  if (error) {
    // 23505 = unique_violation。special_product_types.name の一意制約
    if (error.code === '23505') {
      return { error: 'この種別名は既に登録されています' }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/special-product-types')
  redirect('/masters/special-product-types')
}

// useActionState から呼ぶときは specialProductTypeId をあらかじめ bind してから渡す
export async function updateSpecialProductType(
  specialProductTypeId: string,
  _prevState: SpecialProductTypeFormState,
  formData: FormData
): Promise<SpecialProductTypeFormState> {
  const parsed = readSpecialProductTypeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const appliesThicknessExtra = formData.get('applies_thickness_extra') === 'on'
  const appliesLargePlateExtra =
    formData.get('applies_large_plate_extra') === 'on'
  const alwaysPiecePrice = formData.get('always_piece_price') === 'on'
  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('special_product_types')
    .update({
      ...parsed.values,
      applies_thickness_extra: appliesThicknessExtra,
      applies_large_plate_extra: appliesLargePlateExtra,
      always_piece_price: alwaysPiecePrice,
      is_active: isActive,
    })
    .eq('id', specialProductTypeId)

  if (error) {
    if (error.code === '23505') {
      return { error: 'この種別名は既に登録されています' }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/special-product-types')
  redirect('/masters/special-product-types')
}
