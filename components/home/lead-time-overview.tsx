// ホームの右の「目安納期」（docs/intake/screen-design.md「S-01 ホーム」）。
// 加工部・シャーリング部のカードを縦に並べ、下に混雑度の凡例を出す。

import { Panel } from '@/components/layout/panel'
import { CongestionLegend } from '@/components/lead-time/congestion-legend'
import { LeadTimeCard } from '@/components/lead-time/lead-time-card'
import type { LeadTimeBoard } from '@/lib/lead-time/types'

type LeadTimeOverviewProps = {
  boards: LeadTimeBoard[]
  // 今日の日付 'YYYY-MM-DD'（部署メッセージの表示期限の判定に使う）
  today: string
}

export function LeadTimeOverview({ boards, today }: LeadTimeOverviewProps) {
  return (
    <Panel
      title="目安納期"
      aside={<p className="text-xs text-neutral-500">受注から出荷までの目安</p>}
    >
      <div className="flex flex-col gap-4 p-4">
        {boards.map((board) => (
          <LeadTimeCard key={board.dept} {...board} today={today} />
        ))}
        <CongestionLegend />
      </div>
    </Panel>
  )
}
