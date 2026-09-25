import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 特殊製品単価マスタの一覧。
// 単価情報のため admin 以外は参照不可（docs/table-design.md RLS方針）。
export default async function SpecialProductPricesPage() {
  const user = await getCurrentUser()

  if (user?.role !== 'admin') {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          この画面を参照する権限がありません。
        </p>
      </main>
    )
  }

  const supabase = await createClient()
  const { data: specialProductPrices, error } = await supabase
    .from('special_product_prices')
    .select(
      'id, has_shot, thickness_min, thickness_max, unit_price, valid_from, special_product_types(name), plate_types(name)'
    )
    .order('valid_from', { ascending: false })

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">特殊製品単価マスタ</h1>
        <Link
          href="/masters/special-product-prices/new"
          className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-neutral-900"
        >
          ＋ 新規登録
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          取得に失敗しました: {error.message}
        </p>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
            <th className="py-2 pr-4">特殊製品種別</th>
            <th className="py-2 pr-4">種類</th>
            <th className="py-2 pr-4">ショット</th>
            <th className="py-2 pr-4">板厚範囲（mm）</th>
            <th className="py-2 pr-4">単価</th>
            <th className="py-2 pr-4">適用開始日</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {specialProductPrices?.map((price) => (
            <tr
              key={price.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">
                {price.special_product_types?.name ?? ''}
              </td>
              <td className="py-2 pr-4">{price.plate_types?.name ?? ''}</td>
              <td className="py-2 pr-4">{price.has_shot ? 'あり' : 'なし'}</td>
              <td className="py-2 pr-4">
                {price.thickness_min}〜{price.thickness_max}
              </td>
              <td className="py-2 pr-4">{price.unit_price}</td>
              <td className="py-2 pr-4">{price.valid_from}</td>
              <td className="py-2 pr-4">
                <Link
                  href={`/masters/special-product-prices/${price.id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  編集
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {specialProductPrices?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された特殊製品単価がありません
        </p>
      )}
    </main>
  )
}
