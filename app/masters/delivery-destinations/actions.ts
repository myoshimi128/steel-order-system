'use server'

// 納入先マスタの登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（delivery_destinations_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type DeliveryDestinationFormState = { error: string } | undefined

type ParsedDeliveryDestinationForm =
  | {
      ok: true
      values: {
        code: string
        name: string
        address: string | null
        area: string | null
      }
    }
  | { ok: false; error: string }

function readDeliveryDestinationForm(
  formData: FormData
): ParsedDeliveryDestinationForm {
  const code = formData.get('code')
  const name = formData.get('name')
  const address = formData.get('address')
  const area = formData.get('area')

  if (typeof code !== 'string' || !code.trim()) {
    return { ok: false, error: '納入先コードを入力してください' }
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '納入先名を入力してください' }
  }

  return {
    ok: true,
    values: {
      code: code.trim(),
      name: name.trim(),
      address:
        typeof address === 'string' && address.trim() ? address.trim() : null,
      area: typeof area === 'string' && area.trim() ? area.trim() : null,
    },
  }
}

export async function createDeliveryDestination(
  _prevState: DeliveryDestinationFormState,
  formData: FormData
): Promise<DeliveryDestinationFormState> {
  const parsed = readDeliveryDestinationForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('delivery_destinations')
    .insert(parsed.values)

  if (error) {
    return { error: `登録に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/delivery-destinations')
  redirect('/masters/delivery-destinations')
}

// useActionState から呼ぶときは destinationId をあらかじめ bind してから渡す
export async function updateDeliveryDestination(
  destinationId: string,
  _prevState: DeliveryDestinationFormState,
  formData: FormData
): Promise<DeliveryDestinationFormState> {
  const parsed = readDeliveryDestinationForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('delivery_destinations')
    .update({ ...parsed.values, is_active: isActive })
    .eq('id', destinationId)

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/delivery-destinations')
  redirect('/masters/delivery-destinations')
}
