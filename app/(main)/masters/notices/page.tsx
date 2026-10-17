import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 得意先の注意事項マスタの一覧。得意先のコード順、同じ得意先の中は表示順に並べる。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function NoticesPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  // customers(...)・process_types(...) は、外部キーでつながった行の列も一緒に取得する書き方
  const { data, error } = await supabase
    .from('notices')
    .select(
      'id, cutting_method, body, priority, is_active, customers(code, name), process_types(name)'
    )
    .order('priority')

  const notices = [...(data ?? [])].sort((a, b) =>
    (a.customers?.code ?? '').localeCompare(b.customers?.code ?? '', 'ja', { numeric: true })
  )

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">得意先の注意事項マスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/notices/new"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-neutral-900"
          >
            ＋ 新規登録
          </Link>
        )}
      </div>

      <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        指定した条件（得意先・切断方法・加工種別）がすべて受注に当てはまったとき、受注登録画面の補助エリアに表示します。
        加工の行ごとの注意（板厚・穴径による注意）は「加工の注意事項」に登録します。
      </p>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          取得に失敗しました: {error.message}
        </p>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
            <th className="py-2 pr-4">得意先</th>
            <th className="py-2 pr-4">切断方法</th>
            <th className="py-2 pr-4">加工種別</th>
            <th className="py-2 pr-4">本文</th>
            <th className="py-2 pr-4">表示順</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {notices.map((notice) => (
            <tr key={notice.id} className="border-b border-neutral-100 dark:border-neutral-800">
              <td className="py-2 pr-4">
                {notice.customers ? `${notice.customers.code} ${notice.customers.name}` : ''}
              </td>
              <td className="py-2 pr-4">{notice.cutting_method ?? ''}</td>
              <td className="py-2 pr-4">{notice.process_types?.name ?? ''}</td>
              <td className="py-2 pr-4 whitespace-pre-wrap">{notice.body}</td>
              <td className="py-2 pr-4">{notice.priority}</td>
              <td className="py-2 pr-4">{notice.is_active ? '有効' : '無効'}</td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/notices/${notice.id}`}
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

      {notices.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された注意事項がありません
        </p>
      )}
    </main>
  )
}
