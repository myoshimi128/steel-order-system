'use server'

// 切断単価マスタの登録・更新を行う Server Action。
// cutting_prices は admin 以外に参照・書き込みとも RLS（cutting_prices_admin_all）で
// 拒否されるため、このファイルの関数は admin 以外が呼んでも DB 側で必ず失敗する。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type CuttingPriceFormState = { error: string } | undefined

// supabase/migrations/20260924100000_replace_prices_with_pricing_tables.sql の
// check 句と同じ値をハードコードする
const CUTTING_METHOD_VALUES = ['シャーリング', 'ガス', 'レーザー', 'プラズマ'] as const
const CUTTING_TYPE_VALUES = ['寸法切', 'アイトレ'] as const
type CuttingMethod = (typeof CUTTING_METHOD_VALUES)[number]
type CuttingType = (typeof CUTTING_TYPE_VALUES)[number]

type ParsedCuttingPriceForm =
  | {
      ok: true
      values: {
        plate_type_id: string
        material_id: string | null
        thickness_min: number
        thickness_max: number
        cutting_method: CuttingMethod
        cutting_type: CuttingType
        unit_price: number | null
        valid_from: string
        has_light_tier: boolean
        small_piece_quote_required: boolean
      }
    }
  | { ok: false; error: string }

function readCuttingPriceForm(formData: FormData): ParsedCuttingPriceForm {
  const plateTypeId = formData.get('plate_type_id')
  const materialId = formData.get('material_id')
  const thicknessMinRaw = formData.get('thickness_min')
  const thicknessMaxRaw = formData.get('thickness_max')
  const cuttingMethod = formData.get('cutting_method')
  const cuttingType = formData.get('cutting_type')
  const unitPriceRaw = formData.get('unit_price')
  const validFrom = formData.get('valid_from')

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
    return {
      ok: false,
      error: '板厚下限は上限以下にしてください',
    }
  }

  if (
    typeof cuttingMethod !== 'string' ||
    !CUTTING_METHOD_VALUES.includes(cuttingMethod as CuttingMethod)
  ) {
    return { ok: false, error: '切断方法を選択してください' }
  }

  if (
    typeof cuttingType !== 'string' ||
    !CUTTING_TYPE_VALUES.includes(cuttingType as CuttingType)
  ) {
    return { ok: false, error: '寸法切/アイトレを選択してください' }
  }

  // 空欄は都度見積もり（NULL）を意味する
  let unitPrice: number | null = null
  if (typeof unitPriceRaw === 'string' && unitPriceRaw.trim()) {
    unitPrice = Number(unitPriceRaw)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { ok: false, error: '単価を正しく入力してください' }
    }
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
      thickness_min: thicknessMin,
      thickness_max: thicknessMax,
      cutting_method: cuttingMethod as CuttingMethod,
      cutting_type: cuttingType as CuttingType,
      unit_price: unitPrice,
      valid_from: validFrom,
      // チェックボックスはチェックされているときだけ 'on' が送信される
      has_light_tier: formData.get('has_light_tier') === 'on',
      small_piece_quote_required: formData.get('small_piece_quote_required') === 'on',
    },
  }
}

export async function createCuttingPrice(
  _prevState: CuttingPriceFormState,
  formData: FormData
): Promise<CuttingPriceFormState> {
  const parsed = readCuttingPriceForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('cutting_prices').insert(parsed.values)

  if (error) {
    // 23505 = unique_violation
    if (error.code === '23505') {
      return { error: '同じ条件の切断単価が既に登録されています' }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/cutting-prices')
  redirect('/masters/cutting-prices')
}

// useActionState から呼ぶときは cuttingPriceId をあらかじめ bind してから渡す
export async function updateCuttingPrice(
  cuttingPriceId: string,
  _prevState: CuttingPriceFormState,
  formData: FormData
): Promise<CuttingPriceFormState> {
  const parsed = readCuttingPriceForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('cutting_prices')
    .update(parsed.values)
    .eq('id', cuttingPriceId)

  if (error) {
    if (error.code === '23505') {
      return { error: '同じ条件の切断単価が既に登録されています' }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/cutting-prices')
  redirect('/masters/cutting-prices')
}
