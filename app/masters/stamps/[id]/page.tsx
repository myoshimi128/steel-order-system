import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { StampForm } from '../stamp-form'

// スタンプの編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditStampPage(props: PageProps<'/masters/stamps/[id]'>) {
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
  const { data: stamp } = await supabase
    .from('stamps')
    .select('id, number, body, is_active')
    .eq('id', id)
    .single()

  if (!stamp) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">スタンプの編集</h1>
      <StampForm mode="edit" stamp={stamp} />
    </main>
  )
}
