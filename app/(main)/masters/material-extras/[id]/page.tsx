import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { MaterialExtraForm } from '../material-extra-form'

// 材質エキストラの編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditMaterialExtraPage(
  props: PageProps<'/masters/material-extras/[id]'>
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
  const [{ data: materialExtra }, { data: materials }] = await Promise.all([
    supabase
      .from('material_extras')
      .select('id, material_id, extra_price, blast_furnace_extra')
      .eq('id', id)
      .single(),
    supabase.from('materials').select('id, name').order('name'),
  ])

  if (!materialExtra) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">材質エキストラの編集</h1>
      <MaterialExtraForm
        mode="edit"
        materialExtra={materialExtra}
        materials={materials ?? []}
      />
    </main>
  )
}
