import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 商品マスタ（材質×板厚×形状）の一覧。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function ProductsPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  // materials(name) は products.material_id → materials.id の外部キーを使った
  // Supabase の埋め込み取得。以前は Database 型を渡していなかったため、
  // TypeScript が埋め込み結果を配列型と誤って推論し、実際は単一オブジェクトで
  // 返ってくることと食い違って材質名が表示されない不具合になっていた。
  // lib/database.types.ts を生成して createClient に渡した今は、この関係が
  // 多対一（1商品につき材質1件）だと型からも正しく分かるため埋め込みに戻している。
  const { data: products, error } = await supabase
    .from('products')
    .select('id, material_id, thickness, shape, is_active, materials(name)')
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
              <td className="py-2 pr-4">{product.materials?.name ?? ''}</td>
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
