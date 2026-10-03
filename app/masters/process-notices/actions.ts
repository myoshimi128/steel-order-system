'use server'

// 加工の注意事項マスタ（process_notices）の登録・更新を行う Server Action。
// 加工種別（必須）と、板厚の範囲・穴径の範囲（どちらも任意）に当てはまる加工の行のすぐ下に表示する
// （docs/basic-design.md「注意事項の表示」）。
// 書き込み権限そのものは RLS（process_notices_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { readOptionalRange, readOptionalText } from '@/lib/master-form'
import { createClient } from '@/lib/supabase-server'

export type ProcessNoticeFormState = { error: string } | undefined

type ProcessNoticeValues = {
  process_type_id: string
  thickness_min: number | null
  thickness_max: number | null
  hole_diameter_min: number | null
  hole_diameter_max: number | null
  body: string
}

type ParsedProcessNoticeForm =
  | { ok: true; values: ProcessNoticeValues }
  | { ok: false; error: string }

function readProcessNoticeForm(formData: FormData): ParsedProcessNoticeForm {
  const processTypeId = readOptionalText(formData, 'process_type_id')
  if (!processTypeId) {
    return { ok: false, error: '加工種別を選択してください' }
  }

  // 範囲はどちらも「以上・以下」。片方だけの指定もできる
  const thickness = readOptionalRange(
    formData,
    { min: 'thickness_min', max: 'thickness_max' },
    '板厚'
  )
  if (!thickness.ok) {
    return thickness
  }
  const holeDiameter = readOptionalRange(
    formData,
    { min: 'hole_diameter_min', max: 'hole_diameter_max' },
    '穴径'
  )
  if (!holeDiameter.ok) {
    return holeDiameter
  }

  const body = readOptionalText(formData, 'body')
  if (!body) {
    return { ok: false, error: '文言を入力してください' }
  }

  return {
    ok: true,
    values: {
      process_type_id: processTypeId,
      thickness_min: thickness.value.min,
      thickness_max: thickness.value.max,
      hole_diameter_min: holeDiameter.value.min,
      hole_diameter_max: holeDiameter.value.max,
      body,
    },
  }
}

// 穴径の範囲は、入力の形が「穴」の加工種別でしか判定できない（穴径を入力するのは穴の形だけのため）。
// ほかの形の加工種別に穴径の範囲を付けると、注意事項が一度も表示されなくなるため、登録させない
async function checkHoleDiameterApplicable(values: ProcessNoticeValues): Promise<string | null> {
  if (values.hole_diameter_min === null && values.hole_diameter_max === null) {
    return null
  }
  const supabase = await createClient()
  const { data } = await supabase
    .from('process_types')
    .select('input_shape')
    .eq('id', values.process_type_id)
    .single()
  return data?.input_shape === '穴'
    ? null
    : '穴径の範囲は、入力の形が「穴」の加工種別のときだけ指定できます'
}

export async function createProcessNotice(
  _prevState: ProcessNoticeFormState,
  formData: FormData
): Promise<ProcessNoticeFormState> {
  const parsed = readProcessNoticeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }
  const holeError = await checkHoleDiameterApplicable(parsed.values)
  if (holeError) {
    return { error: holeError }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('process_notices').insert(parsed.values)

  if (error) {
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/process-notices')
  redirect('/masters/process-notices')
}

// useActionState から呼ぶときは processNoticeId をあらかじめ bind してから渡す
export async function updateProcessNotice(
  processNoticeId: string,
  _prevState: ProcessNoticeFormState,
  formData: FormData
): Promise<ProcessNoticeFormState> {
  const parsed = readProcessNoticeForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }
  const holeError = await checkHoleDiameterApplicable(parsed.values)
  if (holeError) {
    return { error: holeError }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('process_notices')
    .update({ ...parsed.values, is_active: formData.get('is_active') === 'on' })
    .eq('id', processNoticeId)

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/process-notices')
  redirect('/masters/process-notices')
}
