import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 種類マスタ（普通板・縞板・ボンデ・ミガキ）の一覧。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function PlateTypesPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  const { data: plateTypes, error } = await supabase
    .from('plate_types')
    .select('id, name, applies_material_extra, is_active')
    .order('name')

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">種類マスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/plate-types/new"
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
            <th className="py-2 pr-4">種類名</th>
            <th className="py-2 pr-4">材質エキストラ</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {plateTypes?.map((plateType) => (
            <tr
              key={plateType.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{plateType.name}</td>
              <td className="py-2 pr-4">
                {plateType.applies_material_extra ? '適用する' : '適用しない'}
              </td>
              <td className="py-2 pr-4">
                {plateType.is_active ? '有効' : '無効'}
              </td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/plate-types/${plateType.id}`}
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

      {plateTypes?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された種類がありません
        </p>
      )}
    </main>
  )
}
