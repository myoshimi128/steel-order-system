import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { getProductCatalog } from '@/lib/product-catalog'
import { CuttingPriceForm } from '../cutting-price-form'

// 切断単価の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditCuttingPricePage(
  props: PageProps<'/masters/cutting-prices/[id]'>
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
    { data: cuttingPrice },
    { data: plateTypes },
    { data: materials },
    products,
  ] = await Promise.all([
    supabase
      .from('cutting_prices')
      .select(
        'id, plate_type_id, material_id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from'
      )
      .eq('id', id)
      .single(),
    supabase
      .from('plate_types')
      .select('id, name, applies_material_extra')
      .order('name'),
    supabase
      .from('materials')
      .select('id, name, has_dedicated_price')
      .order('name'),
    getProductCatalog(),
  ])

  if (!cuttingPrice) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">切断単価の編集</h1>
      <CuttingPriceForm
        mode="edit"
        // cutting_method / cutting_type は DB 上 text 列（CHECK 制約で値を限定）のため、
        // 生成された型では string にしかならない。値自体は制約が保証している
        cuttingPrice={{
          ...cuttingPrice,
          cutting_method: cuttingPrice.cutting_method as
            | 'シャーリング'
            | 'ガス'
            | 'レーザー'
            | 'プラズマ',
          cutting_type: cuttingPrice.cutting_type as '寸法切' | 'アイトレ',
        }}
        plateTypes={plateTypes ?? []}
        materials={materials ?? []}
        products={products}
      />
    </main>
  )
}
