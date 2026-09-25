import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { getProductCatalog } from '@/lib/product-catalog'
import { SpecialProductPriceForm } from '../special-product-price-form'

// 特殊製品単価の新規登録画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function NewSpecialProductPricePage() {
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
  const [{ data: specialProductTypes }, { data: plateTypes }, products] =
    await Promise.all([
      supabase.from('special_product_types').select('id, name').order('name'),
      supabase.from('plate_types').select('id, name').order('name'),
      getProductCatalog(),
    ])

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">特殊製品単価の新規登録</h1>
      <SpecialProductPriceForm
        mode="create"
        specialProductTypes={specialProductTypes ?? []}
        plateTypes={plateTypes ?? []}
        products={products}
      />
    </main>
  )
}
