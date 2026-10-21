// シャーリング部の部署ホーム（S-02。docs/intake/screen-design.md「S-02 部署ホーム」、画面イメージ 02）。
// ホームのメニューの「シャーリング部」と、シャーリング部のメニューの「部署ホーム」から開く。
//   ・上: 営業所・部署の名前、「受付登録へ」「受注登録へ」
//   ・件数のカード: 受付待ち／受注登録待ち／本日納期／CAD 作業待ち・作業中（押すとその一覧へ。本日納期は一覧がまだないため押せない）
//     受付待ち以外は、ログイン中のユーザーの営業所の分（管理者は全部の営業所）
//   ・部署内連絡・部署タスク: Phase 2 のため「準備中」の枠だけ
// 画面イメージの 4 枚目のカード「加工図面 未発行」は、加工図面の発行の機能ができるまで、CAD のカードにしている。

import Link from 'next/link'
import { Icon } from '@/components/layout/icon'
import { PlaceholderPanel } from '@/components/shearing/placeholder-panel'
import { SummaryCard } from '@/components/shearing/summary-card'
import { getCurrentUser } from '@/lib/auth'
import { todayInJapan } from '@/lib/order-entry/date'
import { loadShearingSummary, type ShearingSummary } from '@/lib/shearing/load-shearing-summary'
import { createClient } from '@/lib/supabase-server'

const EMPTY_SUMMARY: ShearingSummary = { waitingIntakes: null, readyUnits: null, dueToday: null, activeCad: null }

export default async function ShearingHomePage() {
  const user = await getCurrentUser()
  const summary = user ? await loadShearingSummary(await createClient(), user, todayInJapan()) : EMPTY_SUMMARY
  // 見出しの上の営業所（管理者は全部の営業所を数えるため「全営業所」と出す）
  const siteLabel = user?.role === 'admin' ? '全営業所' : (user?.siteName ?? '')

  return (
    <main className="flex-1 bg-canvas px-8 py-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">{siteLabel}</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">シャーリング部</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/intake"
            className="flex items-center gap-2 rounded border border-line bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-navy-soft"
          >
            <Icon name="inbox" className="h-4 w-4" />
            受付登録へ
          </Link>
          <Link
            href="/orders/queue"
            className="flex items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-hover"
          >
            <Icon name="pencil" className="h-4 w-4" />
            受注登録へ
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-4">
        <SummaryCard icon="inbox" label="受付待ち" count={summary.waitingIntakes} href="/intake" />
        <SummaryCard icon="box" label="受注登録待ち" count={summary.readyUnits} href="/orders/queue" />
        <SummaryCard icon="clock" label="本日納期" count={summary.dueToday} />
        <SummaryCard icon="monitor" label="CAD 作業待ち・作業中" count={summary.activeCad} href="/cad" />
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-5">
        <PlaceholderPanel title="部署内連絡" icon="chat" description="部署の中での連絡の投稿と一覧は、今後追加します。" />
        <PlaceholderPanel title="部署タスク" icon="list" description="部署のタスクの登録と状態の管理は、今後追加します。" />
      </div>
    </main>
  )
}
