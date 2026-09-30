import { OrderEntryScreen } from '@/components/order-entry/order-entry-screen'
import { getCurrentUser } from '@/lib/auth'
import { sortByCode, type CodeOption } from '@/lib/code-input/code-option'
import { todayInJapan } from '@/lib/order-entry/date'
import { createClient } from '@/lib/supabase-server'

// 受注登録画面（新規）。docs/screen-design.md「受注登録画面」。
// 受注を起票できるのは事務・管理者のみ（現場は受注を起票しない）。登録の権限は RLS でも強制されている。
//
// ヘッダーの番号入力で使う選択肢（得意先・納入先・配達方法）をサーバーで取得し、画面に渡す。

// 得意先・納入先の行を、番号入力の選択肢（番号＝コード、名称、保存する値＝id）に変換する。
// ふりがなは一覧の検索に使う（未登録なら名前だけで検索する）
function toCodedMasterOption(row: {
  id: string
  code: string
  name: string
  name_kana: string | null
}): CodeOption<string> {
  return { code: row.code, label: row.name, value: row.id, kana: row.name_kana ?? undefined }
}

export default async function NewOrderPage() {
  const user = await getCurrentUser()

  if (user?.role !== 'office' && user?.role !== 'admin') {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          この操作を行う権限がありません。
        </p>
      </main>
    )
  }

  const supabase = await createClient()
  const [{ data: customers }, { data: destinations }, { data: deliveryMethods }] =
    await Promise.all([
      supabase.from('customers').select('id, code, name, name_kana').eq('is_active', true),
      supabase
        .from('delivery_destinations')
        .select('id, code, name, name_kana')
        .eq('is_active', true),
      supabase
        .from('delivery_methods')
        .select('id, number, name, requires_note')
        .eq('is_active', true),
    ])

  // 番号入力の選択肢（番号＝コード、名称、保存する値＝id）に変換する
  const masters = {
    customers: sortByCode((customers ?? []).map(toCodedMasterOption)),
    destinations: sortByCode((destinations ?? []).map(toCodedMasterOption)),
    deliveryMethods: sortByCode<string>(
      (deliveryMethods ?? []).map(
        (row): CodeOption<string> => ({ code: String(row.number), label: row.name, value: row.id }),
      ),
    ),
    deliveryMethodIdsRequiringNote: (deliveryMethods ?? [])
      .filter((row) => row.requires_note)
      .map((row) => row.id),
  }

  return (
    <main className="mx-auto flex w-[1280px] flex-1 flex-col">
      <h1 className="sr-only">受注登録</h1>
      {/* 今日の日付はサーバー（日本時間）で求めて渡す。
          ブラウザ側で求めると、サーバーでの描画結果と日付がずれる可能性があるため */}
      <OrderEntryScreen masters={masters} today={todayInJapan()} />
    </main>
  )
}
