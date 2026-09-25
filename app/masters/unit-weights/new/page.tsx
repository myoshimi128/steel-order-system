import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { getProductCatalog } from '@/lib/product-catalog'
import { UnitWeightForm } from '../unit-weight-form'

// 単位質量の新規登録画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function NewUnitWeightPage() {
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
  const [{ data: plateTypes }, { data: manufacturers }, products] =
    await Promise.all([
      supabase.from('plate_types').select('id, name').order('name'),
      supabase.from('manufacturers').select('id, name').order('code'),
      getProductCatalog(),
    ])

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">単位質量の新規登録</h1>
      <UnitWeightForm
        mode="create"
        plateTypes={plateTypes ?? []}
        manufacturers={manufacturers ?? []}
        products={products}
      />
    </main>
  )
}
