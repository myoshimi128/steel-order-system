import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 材質エキストラマスタの一覧。
// 単価情報のため admin 以外は参照不可（docs/table-design.md RLS方針）。
export default async function MaterialExtrasPage() {
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
  const { data: materialExtras, error } = await supabase
    .from('material_extras')
    .select('id, extra_price, blast_furnace_extra, materials(name)')
    .order('name', { referencedTable: 'materials' })

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">材質エキストラマスタ</h1>
        <Link
          href="/masters/material-extras/new"
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
            <th className="py-2 pr-4">材質エキストラ</th>
            <th className="py-2 pr-4">高炉材加算</th>
            <th className="py-2 pr-4" />
          </tr>
        </thead>
        <tbody>
          {materialExtras?.map((extra) => (
            <tr
              key={extra.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{extra.materials?.name ?? ''}</td>
              <td className="py-2 pr-4">{extra.extra_price}</td>
              <td className="py-2 pr-4">{extra.blast_furnace_extra}</td>
              <td className="py-2 pr-4">
                <Link
                  href={`/masters/material-extras/${extra.id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  編集
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {materialExtras?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された材質エキストラがありません
        </p>
      )}
    </main>
  )
}
