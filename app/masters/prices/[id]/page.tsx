import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { PriceForm } from '../price-form'

// 価格の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditPricePage(
  props: PageProps<'/masters/prices/[id]'>
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
  const [{ data: price }, { data: materials }] = await Promise.all([
    supabase
      .from('prices')
      .select(
        'id, material_id, thickness, shape, cutting_method, weight_class, unit_price, valid_from'
      )
      .eq('id', id)
      .single(),
    supabase.from('materials').select('id, name').order('name'),
  ])

  if (!price) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">価格の編集</h1>
      <PriceForm
        mode="edit"
        // shape / cutting_method / weight_class は DB 上 text 列（CHECK 制約で
        // 値を限定）のため、生成された型では string にしかならない。
        // 値自体は制約が保証している
        price={{
          ...price,
          shape: price.shape as '定尺' | '大板',
          cutting_method: price.cutting_method as
            | 'シャーリング'
            | 'ガス'
            | 'レーザー'
            | 'プラズマ'
            | '定尺売り',
          weight_class: price.weight_class as '2kg以下' | '2kg超',
        }}
        materials={materials ?? []}
      />
    </main>
  )
}
