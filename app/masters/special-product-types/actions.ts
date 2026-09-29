'use server'

// 特殊製品種別マスタ（スプライス・ササラ・ベタ丸・ドーナツ）の登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（special_product_types_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  isNumberUniqueViolation,
  readMasterNumber,
  RESERVED_REGION_NUMBERS,
} from '@/lib/master-number'
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
        number: number
        name: string
        weight_basis: WeightBasis
        min_weight: number | null
      }
    }
  | { ok: false; error: string }

function readSpecialProductTypeForm(
  formData: FormData
): ParsedSpecialProductTypeForm {
  // 番号は受注登録画面の「区分」の番号として使う（lib/master-number.ts で共通の検証）
  const number = readMasterNumber(formData)
  if (!number.ok) {
    return number
  }
  // 区分の定数（1 寸法切 / 2 アイトレ / 3 定尺 / 9 加工）と重なる番号は使えない
  // （DB 側の special_product_types_number_check でも拒否される）
  if (RESERVED_REGION_NUMBERS.includes(number.value)) {
    return {
      ok: false,
      error: `番号 ${RESERVED_REGION_NUMBERS.join('・')} は区分の番号と重なるため使えません`,
    }
  }

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
      number: number.value,
      name: name.trim(),
      weight_basis: weightBasis as WeightBasis,
      min_weight: minWeight,
    },
  }
}

// チェックボックスの項目をまとめて読み取る。
// チェックボックスはチェックされているときだけ 'on' が送信される
function readFlags(formData: FormData) {
  return {
    applies_thickness_extra: formData.get('applies_thickness_extra') === 'on',
    applies_large_plate_extra: formData.get('applies_large_plate_extra') === 'on',
    always_piece_price: formData.get('always_piece_price') === 'on',
    has_light_tier: formData.get('has_light_tier') === 'on',
    irregular_cut_quote_required: formData.get('irregular_cut_quote_required') === 'on',
    is_splice_order_type: formData.get('is_splice_order_type') === 'on',
  }
}

// 一意制約違反（23505）のメッセージを、どの項目が重複したかに応じて出し分ける
function uniqueViolationMessage(error: { code?: string; message?: string }): string | null {
  if (isNumberUniqueViolation(error)) {
    return 'この番号は既に使われています'
  }
  // スプライス受注用の種別は 1 つだけ（部分一意インデックス）
  if (error.code === '23505' && (error.message ?? '').includes('splice_order_type')) {
    return 'スプライス受注用の種別は既に登録されています（1 つだけ指定できます）'
  }
  if (error.code === '23505') {
    return 'この種別名は既に登録されています'
  }
  return null
}

export async function createSpecialProductType(
  _prevState: SpecialProductTypeFormState,
  formData: FormData
): Promise<SpecialProductTypeFormState> {
  const parsed = readSpecialProductTypeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('special_product_types').insert({
    ...parsed.values,
    ...readFlags(formData),
  })

  if (error) {
    return { error: uniqueViolationMessage(error) ?? `登録に失敗しました: ${error.message}` }
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

  const supabase = await createClient()
  const { error } = await supabase
    .from('special_product_types')
    .update({
      ...parsed.values,
      ...readFlags(formData),
      is_active: formData.get('is_active') === 'on',
    })
    .eq('id', specialProductTypeId)

  if (error) {
    return { error: uniqueViolationMessage(error) ?? `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/special-product-types')
  redirect('/masters/special-product-types')
}
