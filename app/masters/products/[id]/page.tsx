import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import { ProductForm } from '../product-form'

// 商品の編集画面。admin 以外は DB 側の RLS でも拒否されるが、
// フォーム自体を出さないことで無駄な失敗操作をさせない。
export default async function EditProductPage(
  props: PageProps<'/masters/products/[id]'>
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
  const [{ data: product }, { data: materials }] = await Promise.all([
    supabase
      .from('products')
      .select('id, material_id, thickness, shape, is_active')
      .eq('id', id)
      .single(),
    supabase.from('materials').select('id, name').order('name'),
  ])

  if (!product) {
    notFound()
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-6 text-lg font-semibold">商品の編集</h1>
      <ProductForm
        mode="edit"
        // shape は DB 上 text 列（CHECK 制約で定尺/大板に限定）のため、
        // 生成された型では string にしかならない。値自体は制約が保証している
        product={{ ...product, shape: product.shape as '定尺' | '大板' }}
        materials={materials ?? []}
      />
    </main>
  )
}
