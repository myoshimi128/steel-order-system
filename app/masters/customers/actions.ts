'use server'

// 得意先マスタの登録・更新を行う Server Action。得意先の指定スタンプ（customer_stamps）も一緒に保存する。
// 書き込み権限そのものは RLS（customers_admin_all）でも強制されているため、
// ここでの role チェックは画面側の親切のため（実装方針: クライアント側の表示制御と
// RLS の両方で権限を強制する）。admin 以外が万一フォームを直接送信しても、
// DB 側の RLS が更新を拒否する。

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isDigitsOnly } from '@/lib/master-number'
import { createClient } from '@/lib/supabase-server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type CustomerFormState = { error: string } | undefined

type ParsedCustomerForm =
  | {
      ok: true
      values: { code: string; name: string; name_kana: string | null; sales_rep: string | null }
    }
  | { ok: false; error: string }

// フォームの共通項目を読み取り、簡単なバリデーションを行う
// ok を判別用のプロパティ（discriminant）にすることで、呼び出し側の
// if (!parsed.ok) による型の絞り込みを確実に効かせる
function readCustomerForm(formData: FormData): ParsedCustomerForm {
  const code = formData.get('code')
  const name = formData.get('name')
  const nameKana = formData.get('name_kana')
  const salesRep = formData.get('sales_rep')

  if (typeof code !== 'string' || !code.trim()) {
    return { ok: false, error: '得意先コードを入力してください' }
  }
  // 受注登録画面でテンキーだけで入力できるよう、コードは数字のみとする
  // （DB 側でも customers_code_digits_check で同じ制限をかけている）
  if (!isDigitsOnly(code.trim())) {
    return { ok: false, error: '得意先コードは数字のみで入力してください' }
  }
  if (typeof name !== 'string' || !name.trim()) {
    return { ok: false, error: '得意先名を入力してください' }
  }

  return {
    ok: true,
    values: {
      code: code.trim(),
      name: name.trim(),
      // ふりがなは任意（受注登録画面の検索に使う）
      name_kana:
        typeof nameKana === 'string' && nameKana.trim() ? nameKana.trim() : null,
      sales_rep:
        typeof salesRep === 'string' && salesRep.trim()
          ? salesRep.trim()
          : null,
    },
  }
}

// 得意先の指定スタンプを、フォームでチェックしたものに合わせる。
// 受注登録画面で得意先を選んだ時点で、ここに登録したスタンプにチェックが入る。
// 今の登録内容と比べ、外したものを削除し、新しくチェックしたものを追加する（差分だけを書き込む）。
// 失敗したらメッセージを返す
async function saveCustomerStamps(
  supabase: SupabaseServerClient,
  customerId: string,
  formData: FormData
): Promise<string | null> {
  // チェックボックスは同じ名前で複数送られるため getAll で受け取る（チェックしていないものは送られない）
  const selected = new Set(
    formData.getAll('stamp_ids').filter((value): value is string => typeof value === 'string')
  )

  const { data: current, error: selectError } = await supabase
    .from('customer_stamps')
    .select('stamp_id')
    .eq('customer_id', customerId)
  if (selectError) {
    return `指定スタンプの取得に失敗しました: ${selectError.message}`
  }
  const currentIds = new Set((current ?? []).map((row) => row.stamp_id))

  const removed = [...currentIds].filter((id) => !selected.has(id))
  const added = [...selected].filter((id) => !currentIds.has(id))

  if (removed.length > 0) {
    const { error } = await supabase
      .from('customer_stamps')
      .delete()
      .eq('customer_id', customerId)
      .in('stamp_id', removed)
    if (error) {
      return `指定スタンプの削除に失敗しました: ${error.message}`
    }
  }
  if (added.length > 0) {
    const { error } = await supabase
      .from('customer_stamps')
      .insert(added.map((stampId) => ({ customer_id: customerId, stamp_id: stampId })))
    if (error) {
      return `指定スタンプの登録に失敗しました: ${error.message}`
    }
  }
  return null
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
  // 指定スタンプの登録に得意先の id が必要なため、登録した行の id を受け取る
  const { data: created, error } = await supabase
    .from('customers')
    .insert(parsed.values)
    .select('id')
    .single()

  if (error || !created) {
    return { error: `登録に失敗しました: ${error?.message ?? '不明なエラー'}` }
  }

  const stampError = await saveCustomerStamps(supabase, created.id, formData)
  if (stampError) {
    return { error: stampError }
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

  const stampError = await saveCustomerStamps(supabase, customerId, formData)
  if (stampError) {
    return { error: stampError }
  }

  revalidatePath('/masters/customers')
  redirect('/masters/customers')
}
