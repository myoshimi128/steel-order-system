import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 価格マスタの一覧。
// 仕入単価を含むため admin 以外は参照不可（docs/table-design.md RLS方針）。
// office/factory は RLS でも select できないため、一覧自体をここで出さない。
export default async function PricesPage() {
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
  const { data: prices, error } = await supabase
    .from('prices')
    .select(
      'id, thickness, shape, cutting_method, weight_class, unit_price, valid_from, materials(name)'
    )
    .order('valid_from', { ascending: false })

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">価格マスタ</h1>
        <Link
          href="/masters/prices/new"
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
            <th className="py-2 pr-4">材質</th>
            <th className="py-2 pr-4">板厚（mm）</th>
            <th className="py-2 pr-4">形状</th>
            <th className="py-2 pr-4">切断方法</th>
            <th className="py-2 pr-4">重量区分</th>
            <th className="py-2 pr-4">単価</th>
            <th className="py-2 pr-4">適用開始日</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {prices?.map((price) => (
            <tr
              key={price.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{price.materials[0]?.name ?? ''}</td>
              <td className="py-2 pr-4">{price.thickness}</td>
              <td className="py-2 pr-4">{price.shape}</td>
              <td className="py-2 pr-4">{price.cutting_method}</td>
              <td className="py-2 pr-4">{price.weight_class}</td>
              <td className="py-2 pr-4">{price.unit_price}</td>
              <td className="py-2 pr-4">{price.valid_from}</td>
              <td className="py-2 pr-4">
                <Link
                  href={`/masters/prices/${price.id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  編集
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {prices?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された価格がありません
        </p>
      )}
    </main>
  )
}
