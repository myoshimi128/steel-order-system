import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { PlateTypeForm } from '../plate-type-form'

// 種類の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditPlateTypePage(
  props: PageProps<'/masters/plate-types/[id]'>
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
  const { data: plateType } = await supabase
    .from('plate_types')
    .select('id, name, applies_material_extra, is_active')
    .eq('id', id)
    .single()

  if (!plateType) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">種類の編集</h1>
      <PlateTypeForm mode="edit" plateType={plateType} />
    </main>
  )
}
