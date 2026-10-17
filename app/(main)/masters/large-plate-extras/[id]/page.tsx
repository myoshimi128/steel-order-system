import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { getProductThicknessOptions } from '@/lib/product-catalog'
import { LargePlateExtraForm } from '../large-plate-extra-form'

// 大板加算の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditLargePlateExtraPage(
  props: PageProps<'/masters/large-plate-extras/[id]'>
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
  const [{ data: largePlateExtra }, thicknessOptions] = await Promise.all([
    supabase
      .from('large_plate_extras')
      .select('id, thickness, extra_price')
      .eq('id', id)
      .single(),
    getProductThicknessOptions(),
  ])

  if (!largePlateExtra) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">大板加算の編集</h1>
      <LargePlateExtraForm
        mode="edit"
        largePlateExtra={largePlateExtra}
        thicknessOptions={thicknessOptions}
      />
    </main>
  )
}
