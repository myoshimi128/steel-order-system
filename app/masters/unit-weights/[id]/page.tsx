import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { getProductCatalog } from '@/lib/product-catalog'
import { UnitWeightForm } from '../unit-weight-form'

// 単位質量の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditUnitWeightPage(
  props: PageProps<'/masters/unit-weights/[id]'>
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
  const [
    { data: unitWeight },
    { data: plateTypes },
    { data: manufacturers },
    products,
  ] = await Promise.all([
    supabase
      .from('unit_weights')
      .select(
        'id, plate_type_id, manufacturer_id, thickness, unit_weight, is_active'
      )
      .eq('id', id)
      .single(),
    supabase.from('plate_types').select('id, name').order('name'),
    supabase.from('manufacturers').select('id, name').order('code'),
    getProductCatalog(),
  ])

  if (!unitWeight) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">単位質量の編集</h1>
      <UnitWeightForm
        mode="edit"
        unitWeight={unitWeight}
        plateTypes={plateTypes ?? []}
        manufacturers={manufacturers ?? []}
        products={products}
      />
    </main>
  )
}
