'use server'

// 特殊製品単価マスタの登録・更新を行う Server Action。
// special_product_prices は admin 以外に参照・書き込みとも
// RLS（special_product_prices_admin_all）で拒否されるため、このファイルの関数は
// admin 以外が呼んでも DB 側で必ず失敗する。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type SpecialProductPriceFormState = { error: string } | undefined

type ParsedSpecialProductPriceForm =
  | {
      ok: true
      values: {
        special_product_type_id: string
        plate_type_id: string
        thickness_min: number
        thickness_max: number
        unit_price: number
        valid_from: string
      }
    }
  | { ok: false; error: string }

function readSpecialProductPriceForm(
  formData: FormData
): ParsedSpecialProductPriceForm {
  const specialProductTypeId = formData.get('special_product_type_id')
  const plateTypeId = formData.get('plate_type_id')
  const thicknessMinRaw = formData.get('thickness_min')
  const thicknessMaxRaw = formData.get('thickness_max')
  const unitPriceRaw = formData.get('unit_price')
  const validFrom = formData.get('valid_from')

  if (typeof specialProductTypeId !== 'string' || !specialProductTypeId) {
    return { ok: false, error: '特殊製品種別を選択してください' }
  }
  if (typeof plateTypeId !== 'string' || !plateTypeId) {
    return { ok: false, error: '種類を選択してください' }
  }

  const thicknessMin =
    typeof thicknessMinRaw === 'string' ? Number(thicknessMinRaw) : NaN
  const thicknessMax =
    typeof thicknessMaxRaw === 'string' ? Number(thicknessMaxRaw) : NaN
  if (!Number.isFinite(thicknessMin) || !Number.isFinite(thicknessMax)) {
    return { ok: false, error: '板厚の範囲を正しく入力してください' }
  }
  if (thicknessMin > thicknessMax) {
    return { ok: false, error: '板厚下限は上限以下にしてください' }
  }

  const unitPrice =
    typeof unitPriceRaw === 'string' ? Number(unitPriceRaw) : NaN
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { ok: false, error: '単価を正しく入力してください' }
  }

  if (typeof validFrom !== 'string' || !validFrom) {
    return { ok: false, error: '適用開始日を入力してください' }
  }

  return {
    ok: true,
    values: {
      special_product_type_id: specialProductTypeId,
      plate_type_id: plateTypeId,
      thickness_min: thicknessMin,
      thickness_max: thicknessMax,
      unit_price: unitPrice,
      valid_from: validFrom,
    },
  }
}

export async function createSpecialProductPrice(
  _prevState: SpecialProductPriceFormState,
  formData: FormData
): Promise<SpecialProductPriceFormState> {
  const parsed = readSpecialProductPriceForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const hasShot = formData.get('has_shot') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('special_product_prices')
    .insert({ ...parsed.values, has_shot: hasShot })

  if (error) {
    // 23505 = unique_violation
    if (error.code === '23505') {
      return { error: '同じ条件の特殊製品単価が既に登録されています' }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/special-product-prices')
  redirect('/masters/special-product-prices')
}

// useActionState から呼ぶときは specialProductPriceId をあらかじめ bind してから渡す
export async function updateSpecialProductPrice(
  specialProductPriceId: string,
  _prevState: SpecialProductPriceFormState,
  formData: FormData
): Promise<SpecialProductPriceFormState> {
  const parsed = readSpecialProductPriceForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const hasShot = formData.get('has_shot') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('special_product_prices')
    .update({ ...parsed.values, has_shot: hasShot })
    .eq('id', specialProductPriceId)

  if (error) {
    if (error.code === '23505') {
      return { error: '同じ条件の特殊製品単価が既に登録されています' }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/special-product-prices')
  redirect('/masters/special-product-prices')
}
