import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// スタンプマスタ（現場用伝票に印字する文言）の一覧。番号順に並べる。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
// 得意先ごとの指定スタンプは、得意先の編集画面で設定する。
export default async function StampsPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  const { data: stamps, error } = await supabase
    .from('stamps')
    .select('id, number, body, is_active')
    .order('number')

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">スタンプマスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/stamps/new"
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
            <th className="py-2 pr-4">番号</th>
            <th className="py-2 pr-4">文言</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {stamps?.map((stamp) => (
            <tr key={stamp.id} className="border-b border-neutral-100 dark:border-neutral-800">
              <td className="py-2 pr-4">{stamp.number}</td>
              <td className="py-2 pr-4">{stamp.body}</td>
              <td className="py-2 pr-4">{stamp.is_active ? '有効' : '無効'}</td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/stamps/${stamp.id}`}
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

      {stamps?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録されたスタンプがありません
        </p>
      )}
    </main>
  )
}
