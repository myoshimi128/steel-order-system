import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 特殊製品種別マスタ（スプライス・ササラ・ベタ丸・ドーナツ）の一覧。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function SpecialProductTypesPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  const { data: specialProductTypes, error } = await supabase
    .from('special_product_types')
    .select(
      'id, name, weight_basis, min_weight, applies_thickness_extra, applies_large_plate_extra, always_piece_price, is_active'
    )
    .order('name')

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">特殊製品種別マスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/special-product-types/new"
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
            <th className="py-2 pr-4">種別名</th>
            <th className="py-2 pr-4">重量の基準</th>
            <th className="py-2 pr-4">最低保証重量</th>
            <th className="py-2 pr-4">板厚エキストラ</th>
            <th className="py-2 pr-4">大板加算</th>
            <th className="py-2 pr-4">常に枚単価</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {specialProductTypes?.map((type) => (
            <tr
              key={type.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{type.name}</td>
              <td className="py-2 pr-4">{type.weight_basis}</td>
              <td className="py-2 pr-4">{type.min_weight ?? ''}</td>
              <td className="py-2 pr-4">
                {type.applies_thickness_extra ? '適用する' : '適用しない'}
              </td>
              <td className="py-2 pr-4">
                {type.applies_large_plate_extra ? '適用する' : '適用しない'}
              </td>
              <td className="py-2 pr-4">
                {type.always_piece_price ? 'はい' : 'いいえ'}
              </td>
              <td className="py-2 pr-4">{type.is_active ? '有効' : '無効'}</td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/special-product-types/${type.id}`}
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

      {specialProductTypes?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された特殊製品種別がありません
        </p>
      )}
    </main>
  )
}
