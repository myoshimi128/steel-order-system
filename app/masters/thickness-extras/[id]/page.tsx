import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { getProductThicknessOptions } from '@/lib/product-catalog'
import { ThicknessExtraForm } from '../thickness-extra-form'

// 板厚エキストラの編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditThicknessExtraPage(
  props: PageProps<'/masters/thickness-extras/[id]'>
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
  const [{ data: thicknessExtra }, thicknessOptions] = await Promise.all([
    supabase
      .from('thickness_extras')
      .select('id, thickness, extra_price')
      .eq('id', id)
      .single(),
    getProductThicknessOptions(),
  ])

  if (!thicknessExtra) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">板厚エキストラの編集</h1>
      <ThicknessExtraForm
        mode="edit"
        thicknessExtra={thicknessExtra}
        thicknessOptions={thicknessOptions}
      />
    </main>
  )
}
