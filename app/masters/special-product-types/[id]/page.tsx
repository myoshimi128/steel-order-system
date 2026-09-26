import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { SpecialProductTypeForm } from '../special-product-type-form'

// 特殊製品種別の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditSpecialProductTypePage(
  props: PageProps<'/masters/special-product-types/[id]'>
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
  const { data: specialProductType } = await supabase
    .from('special_product_types')
    .select(
      'id, name, weight_basis, min_weight, applies_thickness_extra, applies_large_plate_extra, always_piece_price, has_light_tier, irregular_cut_quote_required, is_active'
    )
    .eq('id', id)
    .single()

  if (!specialProductType) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">特殊製品種別の編集</h1>
      <SpecialProductTypeForm
        mode="edit"
        // weight_basis は DB 上 text 列（CHECK 制約で3値に限定）のため、
        // 生成された型では string にしかならない。値自体は制約が保証している
        specialProductType={{
          ...specialProductType,
          weight_basis: specialProductType.weight_basis as
            | '実重量'
            | '角重量'
            | '使用材重量',
        }}
      />
    </main>
  )
}
