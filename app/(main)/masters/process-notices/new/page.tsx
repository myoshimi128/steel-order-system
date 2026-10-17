import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { loadProcessTypeOptions } from '../load-process-type-options'
import { ProcessNoticeForm } from '../process-notice-form'

// 加工の注意事項の新規登録画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function NewProcessNoticePage() {
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
  const processTypes = await loadProcessTypeOptions(supabase)

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">加工の注意事項の新規登録</h1>
      <ProcessNoticeForm mode="create" processTypes={processTypes} />
    </main>
  )
}
