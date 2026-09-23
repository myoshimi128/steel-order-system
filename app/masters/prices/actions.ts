'use server'

// 価格マスタの登録・更新を行う Server Action。
// prices は admin 以外に参照・書き込みとも RLS（prices_admin_all）で拒否されるため、
// このファイルの関数は admin 以外が呼んでも DB 側で必ず失敗する。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type PriceFormState = { error: string } | undefined

// supabase/migrations/20260919120000_create_master_tables.sql の check 句と同じ値
const SHAPE_VALUES = ['定尺', '大板'] as const
const CUTTING_METHOD_VALUES = [
  'シャーリング',
  'ガス',
  'レーザー',
  'プラズマ',
  '定尺売り',
] as const
const WEIGHT_CLASS_VALUES = ['2kg以下', '2kg超'] as const

type Shape = (typeof SHAPE_VALUES)[number]
type CuttingMethod = (typeof CUTTING_METHOD_VALUES)[number]
type WeightClass = (typeof WEIGHT_CLASS_VALUES)[number]

type ParsedPriceForm =
  | {
      ok: true
      values: {
        material_id: string
        thickness: number
        shape: Shape
        cutting_method: CuttingMethod
        weight_class: WeightClass
        unit_price: number
        valid_from: string
      }
    }
  | { ok: false; error: string }

function readPriceForm(formData: FormData): ParsedPriceForm {
  const materialId = formData.get('material_id')
  const thicknessRaw = formData.get('thickness')
  const shape = formData.get('shape')
  const cuttingMethod = formData.get('cutting_method')
  const weightClass = formData.get('weight_class')
  const unitPriceRaw = formData.get('unit_price')
  const validFrom = formData.get('valid_from')

  if (typeof materialId !== 'string' || !materialId) {
    return { ok: false, error: '材質を選択してください' }
  }

  const thickness = typeof thicknessRaw === 'string' ? Number(thicknessRaw) : NaN
  if (!Number.isFinite(thickness) || thickness <= 0) {
    return { ok: false, error: '板厚を正しく入力してください' }
  }

  if (typeof shape !== 'string' || !SHAPE_VALUES.includes(shape as Shape)) {
    return { ok: false, error: '形状を選択してください' }
  }

  if (
    typeof cuttingMethod !== 'string' ||
    !CUTTING_METHOD_VALUES.includes(cuttingMethod as CuttingMethod)
  ) {
    return { ok: false, error: '切断方法を選択してください' }
  }

  if (
    typeof weightClass !== 'string' ||
    !WEIGHT_CLASS_VALUES.includes(weightClass as WeightClass)
  ) {
    return { ok: false, error: '重量区分を選択してください' }
  }

  const unitPrice = typeof unitPriceRaw === 'string' ? Number(unitPriceRaw) : NaN
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { ok: false, error: '単価を正しく入力してください' }
  }

  if (typeof validFrom !== 'string' || !validFrom) {
    return { ok: false, error: '適用開始日を入力してください' }
  }

  return {
    ok: true,
    values: {
      material_id: materialId,
      thickness,
      shape: shape as Shape,
      cutting_method: cuttingMethod as CuttingMethod,
      weight_class: weightClass as WeightClass,
      unit_price: unitPrice,
      valid_from: validFrom,
    },
  }
}

export async function createPrice(
  _prevState: PriceFormState,
  formData: FormData
): Promise<PriceFormState> {
  const parsed = readPriceForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('prices').insert(parsed.values)

  if (error) {
    // 23505 = unique_violation。5条件+valid_from の一意制約
    if (error.code === '23505') {
      return {
        error: '同じ条件（材質・板厚・形状・切断方法・重量区分・適用開始日）の価格が既に登録されています',
      }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/prices')
  redirect('/masters/prices')
}

// useActionState から呼ぶときは priceId をあらかじめ bind してから渡す
export async function updatePrice(
  priceId: string,
  _prevState: PriceFormState,
  formData: FormData
): Promise<PriceFormState> {
  const parsed = readPriceForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('prices')
    .update(parsed.values)
    .eq('id', priceId)

  if (error) {
    if (error.code === '23505') {
      return {
        error: '同じ条件（材質・板厚・形状・切断方法・重量区分・適用開始日）の価格が既に登録されています',
      }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/prices')
  redirect('/masters/prices')
}
