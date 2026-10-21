import { cookies } from 'next/headers'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { OrderEntryScreen } from '@/components/order-entry/order-entry-screen'
import { getCurrentUser } from '@/lib/auth'
import { WORK_UNIT_KIND_LABELS } from '@/lib/intake/constants'
import { loadOrderIntakeSource } from '@/lib/intake/load-order-intake-source'
import { queueHref } from '@/lib/intake/queue'
import { todayInJapan } from '@/lib/order-entry/date'
import {
  DOCUMENT_PANEL_OPEN_COOKIE,
  DOCUMENT_PANEL_WIDTH_COOKIE,
  parsePanelOpenCookie,
  parsePanelWidthCookie,
} from '@/lib/order-entry/document-panel-state'
import { loadOrderEntryMasters } from '@/lib/order-entry/load-order-entry-masters'
import { createClient } from '@/lib/supabase-server'

// 受注登録画面（新規）。docs/screen-design.md「受注登録画面」、docs/intake/screen-design.md「S-06c」「S-06d」。
// ① 受注情報 → ② 注文内容 の 2 つの画面を、このページの中で切り替える。
// 受注を起票できるのは事務・管理者のみ（現場は受注を起票しない）。登録の権限は RLS でも強制されている。
//
// 受注は必ず受付を通すため、新規の登録は受注登録待ちの一覧（/orders/queue）の行からだけ始める。
// 行から開くと URL の ?unit= に加工区分の id が付き、その受付の値を受注情報の初期値に入れる。
// ?unit= がない・区分が見つからない・受注登録待ちでない（起票完了済みなど）ときは、受注登録待ちの一覧への案内だけを出す。
// 処理区分 1 変更・2 削除（受注No. で呼び出す）は PR 9b で作る。
//
// 番号入力で使うマスタをサーバーで取得し、画面に渡す。
// 価格マスタ（単価）は、明細ごとに必要な行だけを画面から取得する（actions.ts の fetchPricingRows）。

type NewOrderPageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 受注登録を始められないときの案内（受注登録待ちの一覧へのリンク）
function StartFromQueue({ children, siteCode = null }: { children: ReactNode; siteCode?: string | null }) {
  return (
    <main className="mx-auto max-w-lg px-6 py-10 text-sm text-neutral-600">
      <h1 className="text-xl font-bold text-navy">受注登録</h1>
      <div className="mt-3">{children}</div>
      <Link
        href={queueHref({ site: siteCode })}
        className="mt-5 inline-block rounded bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-hover"
      >
        受注登録待ちの一覧へ
      </Link>
    </main>
  )
}

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600">この操作を行う権限がありません。</p>
      </main>
    )
  }

  // uuid の形でない値は DB に渡さない
  const unitId = typeof params.unit === 'string' && UUID_PATTERN.test(params.unit) ? params.unit : null
  if (!unitId) {
    return (
      <StartFromQueue>
        <p>受注登録は、受注登録待ちの一覧から始めます。登録する注文の行を選んでください。</p>
      </StartFromQueue>
    )
  }

  const supabase = await createClient()
  const [masters, intake] = await Promise.all([
    loadOrderEntryMasters(supabase),
    loadOrderIntakeSource(supabase, unitId),
  ])
  if (!intake) {
    return (
      <StartFromQueue>
        <p>受注登録待ちの区分が見つかりません（受付が削除された可能性があります）。</p>
      </StartFromQueue>
    )
  }
  if (!intake.isReady) {
    return (
      <StartFromQueue siteCode={intake.siteCode}>
        <p>
          受付No. {intake.intakeNo}（{WORK_UNIT_KIND_LABELS[intake.kind]}）は受注登録待ちではありません
          （起票完了済み、または CAD の作業中です）。
        </p>
      </StartFromQueue>
    )
  }

  // 注文書のパネルの幅と開閉を cookie から読む。サーバーで読んでおくと、最初から保存した幅で描ける
  const cookieStore = await cookies()
  const panelWidth = parsePanelWidthCookie(cookieStore.get(DOCUMENT_PANEL_WIDTH_COOKIE)?.value)
  const panelOpen = parsePanelOpenCookie(cookieStore.get(DOCUMENT_PANEL_OPEN_COOKIE)?.value)

  return (
    // 幅は固定せず、共通レイアウトのサイドメニューを除いた残り（閉じた状態で 1216px）いっぱいに広げる
    <main className="flex min-w-0 flex-1 flex-col">
      {/* 今日の日付はサーバー（日本時間）で求めて渡す。
          ブラウザ側で求めると、サーバーでの描画結果と日付がずれる可能性があるため。
          key に加工区分の id を付け、別の区分を開いたら入力の状態を作り直す */}
      <OrderEntryScreen
        key={intake.workUnitId}
        masters={masters}
        today={todayInJapan()}
        initialPanelWidth={panelWidth}
        initialPanelOpen={panelOpen}
        intake={intake}
        staffCode={user.employeeNo}
      />
    </main>
  )
}
