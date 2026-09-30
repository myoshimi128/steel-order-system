import { OrderEntryScreen } from '@/components/order-entry/order-entry-screen'
import { getCurrentUser } from '@/lib/auth'
import { todayInJapan } from '@/lib/order-entry/date'
import { loadOrderEntryMasters } from '@/lib/order-entry/load-order-entry-masters'
import { createClient } from '@/lib/supabase-server'

// 受注登録画面（新規）。docs/screen-design.md「受注登録画面」。
// 受注を起票できるのは事務・管理者のみ（現場は受注を起票しない）。登録の権限は RLS でも強制されている。
//
// ヘッダー・明細の番号入力で使うマスタをサーバーで取得し、画面に渡す。
// 価格マスタ（単価）は、明細ごとに必要な行だけを画面から取得する（actions.ts の fetchPricingRows）。
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
  const masters = await loadOrderEntryMasters(supabase)

  return (
    <main className="mx-auto flex w-[1280px] flex-1 flex-col">
      <h1 className="sr-only">受注登録</h1>
      {/* 今日の日付はサーバー（日本時間）で求めて渡す。
          ブラウザ側で求めると、サーバーでの描画結果と日付がずれる可能性があるため */}
      <OrderEntryScreen masters={masters} today={todayInJapan()} />
    </main>
  )
}
