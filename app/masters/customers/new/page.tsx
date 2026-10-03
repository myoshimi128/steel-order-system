import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { CustomerForm } from '../customer-form'

// 得意先の新規登録画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function NewCustomerPage() {
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

  // 指定スタンプの選択肢（番号順）
  const supabase = await createClient()
  const { data: stamps } = await supabase
    .from('stamps')
    .select('id, number, body, is_active')
    .order('number')

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">得意先の新規登録</h1>
      <CustomerForm mode="create" stamps={stamps ?? []} designatedStampIds={[]} />
    </main>
  )
}
