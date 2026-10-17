import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// メーカーマスタの一覧。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function ManufacturersPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  const { data: manufacturers, error } = await supabase
    .from('manufacturers')
    .select('id, code, name, is_active')
    .order('code')

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">メーカーマスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/manufacturers/new"
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
            <th className="py-2 pr-4">コード</th>
            <th className="py-2 pr-4">メーカー名</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {manufacturers?.map((manufacturer) => (
            <tr
              key={manufacturer.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{manufacturer.code}</td>
              <td className="py-2 pr-4">{manufacturer.name}</td>
              <td className="py-2 pr-4">
                {manufacturer.is_active ? '有効' : '無効'}
              </td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/manufacturers/${manufacturer.id}`}
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

      {manufacturers?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録されたメーカーがありません
        </p>
      )}
    </main>
  )
}
