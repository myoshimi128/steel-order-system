// 部署ホーム（S-02）の「部署内連絡」「部署タスク」の枠。
// どちらも Phase 2（docs/intake/basic-design.md F-24）のため、今は枠と見出しだけを出し、「準備中」と表示する
// （ホームの社内連絡 components/home/notice-board-placeholder.tsx と同じ考え方）。
// 画面イメージ（02 シャーリング部）の連絡・タスクはサンプルのため、コードには持たない。

import { Icon, type AnyIconName } from '@/components/layout/icon'
import { Panel } from '@/components/layout/panel'

type PlaceholderPanelProps = {
  title: string
  icon: AnyIconName
  description: string
}

export function PlaceholderPanel({ title, icon, description }: PlaceholderPanelProps) {
  return (
    <Panel title={title} className="min-h-[360px]">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <Icon name={icon} className="h-8 w-8 text-neutral-300" />
        <p className="text-sm font-semibold text-neutral-500">{title}は準備中です</p>
        <p className="text-xs text-neutral-400">{description}</p>
      </div>
    </Panel>
  )
}
