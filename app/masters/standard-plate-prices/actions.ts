'use server'

// 定尺単価マスタの登録・更新を行う Server Action。
// standard_plate_prices は admin 以外に参照・書き込みとも
// RLS（standard_plate_prices_admin_all）で拒否されるため、このファイルの関数は
// admin 以外が呼んでも DB 側で必ず失敗する。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type StandardPlatePriceFormState = { error: string } | undefined

// supabase/migrations/20260924100000_replace_prices_with_pricing_tables.sql の
// check (plate_size in (...)) と同じ値をハードコードする
const PLATE_SIZE_VALUES = ['3x6', '4x8', '5x10'] as const
type PlateSize = (typeof PLATE_SIZE_VALUES)[number]

type ParsedStandardPlatePriceForm =
  | {
      ok: true
      values: {
        plate_type_id: string
        material_id: string | null
        thickness: number
        plate_size: PlateSize
        unit_price: number
        valid_from: string
      }
    }
  | { ok: false; error: string }

function readStandardPlatePriceForm(
  formData: FormData
): ParsedStandardPlatePriceForm {
  const plateTypeId = formData.get('plate_type_id')
  const materialId = formData.get('material_id')
  const thicknessRaw = formData.get('thickness')
  const plateSize = formData.get('plate_size')
  const unitPriceRaw = formData.get('unit_price')
  const validFrom = formData.get('valid_from')

  if (typeof plateTypeId !== 'string' || !plateTypeId) {
    return { ok: false, error: '種類を選択してください' }
  }

  const thickness =
    typeof thicknessRaw === 'string' ? Number(thicknessRaw) : NaN
  if (!Number.isFinite(thickness) || thickness <= 0) {
    return { ok: false, error: '板厚を正しく入力してください' }
  }

  if (
    typeof plateSize !== 'string' ||
    !PLATE_SIZE_VALUES.includes(plateSize as PlateSize)
  ) {
    return { ok: false, error: 'サイズを選択してください' }
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
      plate_type_id: plateTypeId,
      material_id:
        typeof materialId === 'string' && materialId ? materialId : null,
      thickness,
      plate_size: plateSize as PlateSize,
      unit_price: unitPrice,
      valid_from: validFrom,
    },
  }
}

export async function createStandardPlatePrice(
  _prevState: StandardPlatePriceFormState,
  formData: FormData
): Promise<StandardPlatePriceFormState> {
  const parsed = readStandardPlatePriceForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('standard_plate_prices')
    .insert(parsed.values)

  if (error) {
    // 23505 = unique_violation
    if (error.code === '23505') {
      return { error: '同じ条件の定尺単価が既に登録されています' }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/standard-plate-prices')
  redirect('/masters/standard-plate-prices')
}

// useActionState から呼ぶときは standardPlatePriceId をあらかじめ bind してから渡す
export async function updateStandardPlatePrice(
  standardPlatePriceId: string,
  _prevState: StandardPlatePriceFormState,
  formData: FormData
): Promise<StandardPlatePriceFormState> {
  const parsed = readStandardPlatePriceForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('standard_plate_prices')
    .update(parsed.values)
    .eq('id', standardPlatePriceId)

  if (error) {
    if (error.code === '23505') {
      return { error: '同じ条件の定尺単価が既に登録されています' }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/standard-plate-prices')
  redirect('/masters/standard-plate-prices')
}
