import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 範囲（以上・以下）の表示。例: 13 以上 / 9 〜 16 / 12 以下。指定がなければ空
function rangeText(min: number | null, max: number | null): string {
  if (min !== null && max !== null) {
    return `${min} 〜 ${max}`
  }
  if (min !== null) {
    return `${min} 以上`
  }
  if (max !== null) {
    return `${max} 以下`
  }
  return ''
}

// 加工の注意事項マスタの一覧。加工種別の番号順（加工の順番）に並べる。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function ProcessNoticesPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  // process_types(...) は、外部キーでつながった加工種別の列も一緒に取得する書き方
  const { data, error } = await supabase
    .from('process_notices')
    .select(
      'id, thickness_min, thickness_max, hole_diameter_min, hole_diameter_max, body, is_active, process_types(number, name)'
    )

  const processNotices = [...(data ?? [])].sort(
    (a, b) => (a.process_types?.number ?? 999) - (b.process_types?.number ?? 999)
  )

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">加工の注意事項マスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/process-notices/new"
            className="rounded bg-neutral-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-neutral-900"
          >
            ＋ 新規登録
          </Link>
        )}
      </div>

      <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
        加工種別と板厚・穴径の範囲に当てはまる加工の行のすぐ下に表示します（表示のみで、登録は止めません）。
        範囲はどちらも「以上・以下」で、指定しなければその加工種別の行すべてに表示します。
      </p>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          取得に失敗しました: {error.message}
        </p>
      )}

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
            <th className="py-2 pr-4">加工種別</th>
            <th className="py-2 pr-4">板厚（mm）</th>
            <th className="py-2 pr-4">穴径（φ）</th>
            <th className="py-2 pr-4">文言</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {processNotices.map((notice) => (
            <tr key={notice.id} className="border-b border-neutral-100 dark:border-neutral-800">
              <td className="py-2 pr-4">
                {notice.process_types
                  ? `${notice.process_types.number ?? '—'} ${notice.process_types.name}`
                  : ''}
              </td>
              <td className="py-2 pr-4">{rangeText(notice.thickness_min, notice.thickness_max)}</td>
              <td className="py-2 pr-4">
                {rangeText(notice.hole_diameter_min, notice.hole_diameter_max)}
              </td>
              <td className="py-2 pr-4">{notice.body}</td>
              <td className="py-2 pr-4">{notice.is_active ? '有効' : '無効'}</td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/process-notices/${notice.id}`}
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

      {processNotices.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された加工の注意事項がありません
        </p>
      )}
    </main>
  )
}
