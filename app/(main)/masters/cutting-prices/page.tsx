import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 切断単価マスタの一覧。
// 単価情報のため admin 以外は参照不可（docs/table-design.md RLS方針）。
// office/factory は RLS でも select できないため、一覧自体をここで出さない。
export default async function CuttingPricesPage() {
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
  const { data: cuttingPrices, error } = await supabase
    .from('cutting_prices')
    .select(
      'id, thickness_min, thickness_max, cutting_method, cutting_type, unit_price, valid_from, has_light_tier, small_piece_quote_required, plate_types(name), materials(name)'
    )
    .order('valid_from', { ascending: false })

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">切断単価マスタ</h1>
        <Link
          href="/masters/cutting-prices/new"
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
            <th className="py-2 pr-4">種類</th>
            <th className="py-2 pr-4">材質</th>
            <th className="py-2 pr-4">板厚範囲（mm）</th>
            <th className="py-2 pr-4">切断方法</th>
            <th className="py-2 pr-4">寸法切／アイトレ</th>
            <th className="py-2 pr-4">単価</th>
            <th className="py-2 pr-4">1.5kgの段</th>
            <th className="py-2 pr-4">2kg未満</th>
            <th className="py-2 pr-4">適用開始日</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {cuttingPrices?.map((price) => (
            <tr
              key={price.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{price.plate_types?.name ?? ''}</td>
              <td className="py-2 pr-4">
                {price.materials?.name ?? 'SS400ベース'}
              </td>
              <td className="py-2 pr-4">
                {price.thickness_min}〜{price.thickness_max}
              </td>
              <td className="py-2 pr-4">{price.cutting_method}</td>
              <td className="py-2 pr-4">{price.cutting_type}</td>
              <td className="py-2 pr-4">{price.unit_price ?? '都度見積もり'}</td>
              <td className="py-2 pr-4">{price.has_light_tier ? 'あり' : 'なし'}</td>
              <td className="py-2 pr-4">
                {price.small_piece_quote_required ? '別途見積もり' : '保証重量'}
              </td>
              <td className="py-2 pr-4">{price.valid_from}</td>
              <td className="py-2 pr-4">
                <Link
                  href={`/masters/cutting-prices/${price.id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  編集
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cuttingPrices?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された切断単価がありません
        </p>
      )}
    </main>
  )
}
