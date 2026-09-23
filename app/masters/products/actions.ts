'use server'

// 商品マスタ（材質×板厚×形状）の登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（products_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type ProductFormState = { error: string } | undefined

// supabase/migrations/20260919120000_create_master_tables.sql の
// check (shape in (...)) と同じ値をハードコードする
const SHAPE_VALUES = ['定尺', '大板'] as const
type Shape = (typeof SHAPE_VALUES)[number]

type ParsedProductForm =
  | { ok: true; values: { material_id: string; thickness: number; shape: Shape } }
  | { ok: false; error: string }

function readProductForm(formData: FormData): ParsedProductForm {
  const materialId = formData.get('material_id')
  const thicknessRaw = formData.get('thickness')
  const shape = formData.get('shape')

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

  return {
    ok: true,
    values: { material_id: materialId, thickness, shape: shape as Shape },
  }
}

export async function createProduct(
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const parsed = readProductForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('products').insert(parsed.values)

  if (error) {
    // 23505 = unique_violation。material_id + thickness + shape の一意制約
    if (error.code === '23505') {
      return {
        error: '同じ条件（材質・板厚・形状）の商品が既に登録されています',
      }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/products')
  redirect('/masters/products')
}

// useActionState から呼ぶときは productId をあらかじめ bind してから渡す
export async function updateProduct(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const parsed = readProductForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('products')
    .update({ ...parsed.values, is_active: isActive })
    .eq('id', productId)

  if (error) {
    if (error.code === '23505') {
      return {
        error: '同じ条件（材質・板厚・形状）の商品が既に登録されています',
      }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/products')
  redirect('/masters/products')
}
