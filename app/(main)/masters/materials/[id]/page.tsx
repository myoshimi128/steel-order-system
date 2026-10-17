import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { MaterialForm } from '../material-form'

// 材質の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditMaterialPage(
  props: PageProps<'/masters/materials/[id]'>
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
  const { data: material } = await supabase
    .from('materials')
    .select(
      'id, number, name, line_mark, display_color, default_steel_making, has_dedicated_price, is_active'
    )
    .eq('id', id)
    .single()

  if (!material) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">材質の編集</h1>
      <MaterialForm
        mode="edit"
        // default_steel_making は DB 上 text 列（CHECK 制約で 2 値に限定）のため、型だけ合わせる
        material={{
          ...material,
          default_steel_making: material.default_steel_making as '電炉材' | '高炉材',
        }}
      />
    </main>
  )
}
