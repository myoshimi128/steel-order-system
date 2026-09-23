'use server'

// 得意先マスタの登録・更新を行う Server Action。
// 書き込み権限そのものは RLS（customers_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため（実装方針: クライアント側の表示制御と
// RLS の両方で権限を強制する）。admin 以外が万一フォームを直接送信しても、
// DB 側の RLS が更新を拒否する。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type CustomerFormState = { error: string } | undefined

type ParsedCustomerForm =
  | { ok: true; values: { code: string; name: string; sales_rep: string | null } }
  | { ok: false; error: string }

// フォームの共通項目を読み取り、簡単なバリデーションを行う
// ok を判別用のプロパティ（discriminant）にすることで、呼び出し側の
// if (!parsed.ok) による型の絞り込みを確実に効かせる
function readCustomerForm(formData: FormData): ParsedCustomerForm {
  const code = formData.get('code')
  const name = formData.get('name')
  const salesRep = formData.get('sales_rep')

  if (typeof code !== 'string' || !code.trim()) {
    return { ok: false, error: '得意先コードを入力してください' }
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '得意先名を入力してください' }
  }

  return {
    ok: true,
    values: {
      code: code.trim(),
      name: name.trim(),
      sales_rep:
        typeof salesRep === 'string' && salesRep.trim()
          ? salesRep.trim()
          : null,
    },
  }
}

export async function createCustomer(
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = readCustomerForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('customers').insert(parsed.values)

  if (error) {
    return { error: `登録に失敗しました: ${error.message}` }
  }

  // 一覧のキャッシュを最新化してから一覧に戻る
  revalidatePath('/masters/customers')
  redirect('/masters/customers')
}

// useActionState から呼ぶときは customerId をあらかじめ bind してから渡す
// （node_modules/next/dist/docs 内 guides/forms.md の「Passing additional arguments」参照）
export async function updateCustomer(
  customerId: string,
  _prevState: CustomerFormState,
  formData: FormData
): Promise<CustomerFormState> {
  const parsed = readCustomerForm(formData)
  if (!parsed.ok) {
    return { error: parsed.error }
  }

  // 新規登録フォームにはないチェックボックスなので、編集フォームでのみ読み取る
  const isActive = formData.get('is_active') === 'on'

  const supabase = await createClient()
  const { error } = await supabase
    .from('customers')
    .update({ ...parsed.values, is_active: isActive })
    .eq('id', customerId)

  if (error) {
    return { error: `更新に失敗しました: ${error.message}` }
  }

  revalidatePath('/masters/customers')
  redirect('/masters/customers')
}
