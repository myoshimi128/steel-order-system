import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 商品マスタ（種類×材質×板厚×形状）の一覧。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function ProductsPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  // plate_types(name) / materials(name) はどちらも products 側が持つ外部キー
  // （plate_type_id / material_id）を使った埋め込み取得。1商品につきそれぞれ
  // 1件（多対一）なので、lib/database.types.ts の型どおり単一オブジェクトで返る。
  const { data: products, error } = await supabase
    .from('products')
    .select(
      'id, thickness, shape, is_active, plate_types(name), materials(name)'
    )
    .order('thickness')

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">商品マスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/products/new"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-neutral-900"
          >
            ＋ 新規登録
          </Link>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          取得に失敗しました: {error.message}
        </p>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
            <th className="py-2 pr-4">種類</th>
            <th className="py-2 pr-4">材質</th>
            <th className="py-2 pr-4">板厚（mm）</th>
            <th className="py-2 pr-4">形状</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {products?.map((product) => (
            <tr
              key={product.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{product.plate_types?.name ?? ''}</td>
              <td className="py-2 pr-4">
                {product.materials?.name ?? '（材質なし）'}
              </td>
              <td className="py-2 pr-4">{product.thickness}</td>
              <td className="py-2 pr-4">{product.shape}</td>
              <td className="py-2 pr-4">
                {product.is_active ? '有効' : '無効'}
              </td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/products/${product.id}`}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    編集
                  </Link>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {products?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された商品がありません
        </p>
      )}
    </main>
  )
}
