import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { CustomerForm } from '../customer-form'

// 得意先の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditCustomerPage(
  props: PageProps<'/masters/customers/[id]'>
) {
  const { id } = await props.params
  const user = await getCurrentUser()

  if (user?.role !== 'admin') {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          この操作を行う権限がありません。
        </p>
      </main>
    )
  }

  const supabase = await createClient()
  // 得意先・スタンプの選択肢（番号順）・今の指定スタンプをまとめて取得する
  const [{ data: customer }, { data: stamps }, { data: customerStamps }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, code, name, name_kana, sales_rep, is_active')
      .eq('id', id)
      .single(),
    supabase.from('stamps').select('id, number, body, is_active').order('number'),
    supabase.from('customer_stamps').select('stamp_id').eq('customer_id', id),
  ])

  if (!customer) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">得意先の編集</h1>
      <CustomerForm
        mode="edit"
        customer={customer}
        stamps={stamps ?? []}
        designatedStampIds={(customerStamps ?? []).map((row) => row.stamp_id)}
      />
    </main>
  )
}
