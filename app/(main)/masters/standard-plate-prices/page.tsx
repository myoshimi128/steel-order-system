import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 定尺単価マスタの一覧。
// 単価情報のため admin 以外は参照不可（docs/table-design.md RLS方針）。
export default async function StandardPlatePricesPage() {
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
  const { data: standardPlatePrices, error } = await supabase
    .from('standard_plate_prices')
    .select(
      'id, thickness, plate_size, unit_price, valid_from, plate_types(name), materials(name)'
    )
    .order('valid_from', { ascending: false })

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">定尺単価マスタ</h1>
        <Link
          href="/masters/standard-plate-prices/new"
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
            <th className="py-2 pr-4">板厚（mm）</th>
            <th className="py-2 pr-4">サイズ</th>
            <th className="py-2 pr-4">単価</th>
            <th className="py-2 pr-4">適用開始日</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {standardPlatePrices?.map((price) => (
            <tr
              key={price.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{price.plate_types?.name ?? ''}</td>
              <td className="py-2 pr-4">
                {price.materials?.name ?? '（材質なし）'}
              </td>
              <td className="py-2 pr-4">{price.thickness}</td>
              <td className="py-2 pr-4">{price.plate_size}</td>
              <td className="py-2 pr-4">{price.unit_price}</td>
              <td className="py-2 pr-4">{price.valid_from}</td>
              <td className="py-2 pr-4">
                <Link
                  href={`/masters/standard-plate-prices/${price.id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  編集
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {standardPlatePrices?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された定尺単価がありません
        </p>
      )}
    </main>
  )
}
