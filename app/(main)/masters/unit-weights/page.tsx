import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 単位質量マスタ（縞板の重量計算用）の一覧。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function UnitWeightsPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  // plate_types(name) / manufacturers(name) は unit_weights 側が持つ外部キーを
  // 使った埋め込み取得（多対一なので単一オブジェクトで返る）。
  const { data: unitWeights, error } = await supabase
    .from('unit_weights')
    .select(
      'id, thickness, unit_weight, is_active, plate_types(name), manufacturers(name)'
    )
    .order('thickness')

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">単位質量マスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/unit-weights/new"
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
            <th className="py-2 pr-4">メーカー</th>
            <th className="py-2 pr-4">板厚（mm）</th>
            <th className="py-2 pr-4">単位質量（kg/m²）</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {unitWeights?.map((unitWeight) => (
            <tr
              key={unitWeight.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">
                {unitWeight.plate_types?.name ?? ''}
              </td>
              <td className="py-2 pr-4">
                {unitWeight.manufacturers?.name ?? ''}
              </td>
              <td className="py-2 pr-4">{unitWeight.thickness}</td>
              <td className="py-2 pr-4">{unitWeight.unit_weight}</td>
              <td className="py-2 pr-4">
                {unitWeight.is_active ? '有効' : '無効'}
              </td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/unit-weights/${unitWeight.id}`}
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

      {unitWeights?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された単位質量がありません
        </p>
      )}
    </main>
  )
}
