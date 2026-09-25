'use server'

// 材質エキストラマスタの登録・更新を行う Server Action。
// material_extras は admin 以外に参照・書き込みとも RLS（material_extras_admin_all）で
// 拒否されるため、このファイルの関数は admin 以外が呼んでも DB 側で必ず失敗する。
//
// material_id ごとに1行（一意制約あり）。
//   extra_price        : SS400ベースの単価にこの材質を使う場合の加算
//   blast_furnace_extra: 受注が高炉材のときに加算する値（通常10、SS400は0）
// docs/basic-design.md 母材費の自動計算を参照。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type MaterialExtraFormState = { error: string } | undefined

type ParsedMaterialExtraForm =
  | {
      ok: true
      values: {
        material_id: string
        extra_price: number
        blast_furnace_extra: number
      }
    }
  | { ok: false; error: string }

function readMaterialExtraForm(formData: FormData): ParsedMaterialExtraForm {
  const materialId = formData.get('material_id')
  const extraPriceRaw = formData.get('extra_price')
  const blastFurnaceExtraRaw = formData.get('blast_furnace_extra')

  if (typeof materialId !== 'string' || !materialId) {
    return { ok: false, error: '材質を選択してください' }
  }

  const extraPrice =
    typeof extraPriceRaw === 'string' ? Number(extraPriceRaw) : NaN
  if (!Number.isFinite(extraPrice)) {
    return { ok: false, error: '材質エキストラを正しく入力してください' }
  }

  const blastFurnaceExtra =
    typeof blastFurnaceExtraRaw === 'string' ? Number(blastFurnaceExtraRaw) : NaN
  if (!Number.isFinite(blastFurnaceExtra)) {
    return { ok: false, error: '高炉材加算を正しく入力してください' }
  }

  return {
    ok: true,
    values: {
      material_id: materialId,
      extra_price: extraPrice,
      blast_furnace_extra: blastFurnaceExtra,
    },
  }
}

export async function createMaterialExtra(
  _prevState: MaterialExtraFormState,
  formData: FormData
): Promise<MaterialExtraFormState> {
  const parsed = readMaterialExtraForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('material_extras').insert(parsed.values)

  if (error) {
    // 23505 = unique_violation。material_id の一意制約
    if (error.code === '23505') {
      return { error: 'この材質の材質エキストラは既に登録されています' }
    }
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/material-extras')
  redirect('/masters/material-extras')
}

// useActionState から呼ぶときは materialExtraId をあらかじめ bind してから渡す
export async function updateMaterialExtra(
  materialExtraId: string,
  _prevState: MaterialExtraFormState,
  formData: FormData
): Promise<MaterialExtraFormState> {
  const parsed = readMaterialExtraForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('material_extras')
    .update(parsed.values)
    .eq('id', materialExtraId)

  if (error) {
    if (error.code === '23505') {
      return { error: 'この材質の材質エキストラは既に登録されています' }
    }
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/material-extras')
  redirect('/masters/material-extras')
}
