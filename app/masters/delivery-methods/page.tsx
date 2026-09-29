import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'

// 配達方法マスタ（宵積み・2便・置場引取 など）の一覧。
// 参照は office/factory/admin 全ロール可、登録・編集は admin のみ
// （docs/table-design.md RLS方針「マスタ各種」）。
export default async function DeliveryMethodsPage() {
  const user = await getCurrentUser()
  const isAdmin = user?.role === 'admin'

  const supabase = await createClient()
  const { data: deliveryMethods, error } = await supabase
    .from('delivery_methods')
    .select('id, number, name, requires_note, is_active')
    .order('number')

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">配達方法マスタ</h1>
        {isAdmin && (
          <Link
            href="/masters/delivery-methods/new"
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
            <th className="py-2 pr-4">配達方法名</th>
            <th className="py-2 pr-4">文字の入力</th>
            <th className="py-2 pr-4">状態</th>
            {isAdmin && <th className="py-2 pr-4" />}
          </tr>
        </thead>
        <tbody>
          {deliveryMethods?.map((deliveryMethod) => (
            <tr
              key={deliveryMethod.id}
              className="border-b border-neutral-100 dark:border-neutral-800"
            >
              <td className="py-2 pr-4">{deliveryMethod.number}</td>
              <td className="py-2 pr-4">{deliveryMethod.name}</td>
              <td className="py-2 pr-4">
                {deliveryMethod.requires_note ? 'あり（フリー）' : ''}
              </td>
              <td className="py-2 pr-4">
                {deliveryMethod.is_active ? '有効' : '無効'}
              </td>
              {isAdmin && (
                <td className="py-2 pr-4">
                  <Link
                    href={`/masters/delivery-methods/${deliveryMethod.id}`}
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

      {deliveryMethods?.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">
          登録された配達方法がありません
        </p>
      )}
    </main>
  )
}
