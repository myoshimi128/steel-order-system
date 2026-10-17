import { cookies } from 'next/headers'
import { OrderEntryScreen } from '@/components/order-entry/order-entry-screen'
import { getCurrentUser } from '@/lib/auth'
import { todayInJapan } from '@/lib/order-entry/date'
import {
  DOCUMENT_PANEL_OPEN_COOKIE,
  DOCUMENT_PANEL_WIDTH_COOKIE,
  parsePanelOpenCookie,
  parsePanelWidthCookie,
} from '@/lib/order-entry/document-panel-state'
import { loadOrderEntryMasters } from '@/lib/order-entry/load-order-entry-masters'
import { createClient } from '@/lib/supabase-server'

// 受注登録画面（新規）。docs/screen-design.md「受注登録画面」。
// ① 受注情報 → ② 注文内容 → ③ 伝票の指示 の 3 つの画面を、このページの中で切り替える。
// 受注を起票できるのは事務・管理者のみ（現場は受注を起票しない）。登録の権限は RLS でも強制されている。
//
// 番号入力で使うマスタをサーバーで取得し、画面に渡す。
// 価格マスタ（単価）は、明細ごとに必要な行だけを画面から取得する（actions.ts の fetchPricingRows）。
export default async function NewOrderPage() {
  const user = await getCurrentUser()

  if (user?.role !== 'office' && user?.role !== 'admin') {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600">この操作を行う権限がありません。</p>
      </main>
    )
  }

  const supabase = await createClient()
  const masters = await loadOrderEntryMasters(supabase)

  // 注文書のパネルの幅と開閉を cookie から読む。サーバーで読んでおくと、最初から保存した幅で描ける
  const cookieStore = await cookies()
  const panelWidth = parsePanelWidthCookie(cookieStore.get(DOCUMENT_PANEL_WIDTH_COOKIE)?.value)
  const panelOpen = parsePanelOpenCookie(cookieStore.get(DOCUMENT_PANEL_OPEN_COOKIE)?.value)

  return (
    // 幅は固定せず、共通レイアウトのサイドメニューを除いた残り（閉じた状態で 1216px）いっぱいに広げる
    <main className="flex min-w-0 flex-1 flex-col">
      {/* 今日の日付はサーバー（日本時間）で求めて渡す。
          ブラウザ側で求めると、サーバーでの描画結果と日付がずれる可能性があるため */}
      <OrderEntryScreen
        masters={masters}
        today={todayInJapan()}
        initialPanelWidth={panelWidth}
        initialPanelOpen={panelOpen}
      />
    </main>
  )
}
