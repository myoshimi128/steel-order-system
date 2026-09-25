import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { getProductCatalog } from '@/lib/product-catalog'
import { StandardPlatePriceForm } from '../standard-plate-price-form'

// 定尺単価の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditStandardPlatePricePage(
  props: PageProps<'/masters/standard-plate-prices/[id]'>
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
    { data: standardPlatePrice },
    { data: plateTypes },
    { data: materials },
    products,
  ] = await Promise.all([
    supabase
      .from('standard_plate_prices')
      .select(
        'id, plate_type_id, material_id, thickness, plate_size, unit_price, valid_from'
      )
      .eq('id', id)
      .single(),
    supabase.from('plate_types').select('id, name').order('name'),
    supabase.from('materials').select('id, name').order('name'),
    getProductCatalog(),
  ])

  if (!standardPlatePrice) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">定尺単価の編集</h1>
      <StandardPlatePriceForm
        mode="edit"
        // plate_size は DB 上 text 列（CHECK 制約で3値に限定）のため、
        // 生成された型では string にしかならない。値自体は制約が保証している
        standardPlatePrice={{
          ...standardPlatePrice,
          plate_size: standardPlatePrice.plate_size as
            | '3x6'
            | '4x8'
            | '5x10',
        }}
        plateTypes={plateTypes ?? []}
        materials={materials ?? []}
        products={products}
      />
    </main>
  )
}
