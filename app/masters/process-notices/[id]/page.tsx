import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { loadProcessTypeOptions } from '../load-process-type-options'
import { ProcessNoticeForm } from '../process-notice-form'

// 加工の注意事項の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditProcessNoticePage(
  props: PageProps<'/masters/process-notices/[id]'>
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
  const [{ data: processNotice }, processTypes] = await Promise.all([
    supabase
      .from('process_notices')
      .select(
        'id, process_type_id, thickness_min, thickness_max, hole_diameter_min, hole_diameter_max, body, is_active'
      )
      .eq('id', id)
      .single(),
    loadProcessTypeOptions(supabase),
  ])

  if (!processNotice) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">加工の注意事項の編集</h1>
      <ProcessNoticeForm mode="edit" processNotice={processNotice} processTypes={processTypes} />
    </main>
  )
}
