// ホーム（S-01。docs/intake/screen-design.md「S-01 ホーム」）。以前の簡易なメインメニューを置き換えた。
//   ・上部: あいさつ（「おはようございます、○○さん」）と今日の日付
//   ・左: 社内連絡（Phase 2 までは「準備中」の枠だけ）
//   ・右: 目安納期（加工部・シャーリング部のカード。納期連絡の画面で公開した内容）
// 画面へのリンクは、サイドメニュー（ホームのメニュー）から開く。

import { LeadTimeOverview } from '@/components/home/lead-time-overview'
import { NoticeBoardPlaceholder } from '@/components/home/notice-board-placeholder'
import { getCurrentUser } from '@/lib/auth'
import { formatJapaneseDate, greetingFor } from '@/lib/home/greeting'
import { loadLeadTimeBoards } from '@/lib/lead-time/load-lead-times'
import { HOME_LEAD_TIME_DEPTS } from '@/lib/lead-time/types'
import { todayInJapan } from '@/lib/order-entry/date'

export default async function HomePage() {
  // ユーザーと目安納期を並行して読む
  const [user, boards] = await Promise.all([
    getCurrentUser(),
    loadLeadTimeBoards(HOME_LEAD_TIME_DEPTS),
  ])

  // あいさつ・日付・メッセージの表示期限は、表示した時点の日本時間で決める
  const now = new Date()

  return (
    <main className="flex-1 bg-canvas px-8 py-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-2xl font-bold text-neutral-900">
          {greetingFor(now)}
          {user && `、${user.name}さん`}
        </h1>
        <p className="text-sm text-neutral-500">{formatJapaneseDate(now)}</p>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)_440px] items-start gap-5">
        <NoticeBoardPlaceholder />
        <LeadTimeOverview boards={boards} today={todayInJapan(now)} />
      </div>
    </main>
  )
}
