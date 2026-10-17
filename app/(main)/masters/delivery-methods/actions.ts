'use server'

// 配達方法マスタ（宵積み・2便・置場引取 など）の登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（delivery_methods_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isNumberUniqueViolation, readMasterNumber } from '@/lib/master-number'
import { createClient } from '@/lib/supabase-server'

export type DeliveryMethodFormState = { error: string } | undefined

type ParsedDeliveryMethodForm =
  | { ok: true; values: { number: number; name: string; requires_note: boolean } }
  | { ok: false; error: string }

function readDeliveryMethodForm(formData: FormData): ParsedDeliveryMethodForm {
  // 番号は受注登録画面で配達を選ぶときに入力する値（lib/master-number.ts で共通の検証）
  const number = readMasterNumber(formData)
  if (!number.ok) {
    return number
  }

  const name = formData.get('name')
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '配達方法名を入力してください' }
  }

  return {
    ok: true,
    values: {
      number: number.value,
      name: name.trim(),
      // 選んだときに文字の入力欄を出すか（フリーのみ）。チェックボックスは未チェックだと送信されない
      requires_note: formData.get('requires_note') === 'on',
    },
  }
}

// 一意制約違反（23505）のメッセージを、どの項目が重複したかに応じて出し分ける
function uniqueViolationMessage(error: { code?: string; message?: string }): string | null {
  if (isNumberUniqueViolation(error)) {
    return 'この番号は既に使われています'
  }
  if (error.code === '23505') {
    return 'この配達方法名は既に登録されています'
  }
  return null
}

export async function createDeliveryMethod(
  _prevState: DeliveryMethodFormState,
  formData: FormData
): Promise<DeliveryMethodFormState> {
  const parsed = readDeliveryMethodForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('delivery_methods').insert(parsed.values)

  if (error) {
    return { error: uniqueViolationMessage(error) ?? `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/delivery-methods')
  redirect('/masters/delivery-methods')
}

// useActionState から呼ぶときは deliveryMethodId をあらかじめ bind してから渡す
export async function updateDeliveryMethod(
  deliveryMethodId: string,
  _prevState: DeliveryMethodFormState,
  formData: FormData
): Promise<DeliveryMethodFormState> {
  const parsed = readDeliveryMethodForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('delivery_methods')
    .update({ ...parsed.values, is_active: formData.get('is_active') === 'on' })
    .eq('id', deliveryMethodId)

  if (error) {
    return { error: uniqueViolationMessage(error) ?? `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/delivery-methods')
  redirect('/masters/delivery-methods')
}
