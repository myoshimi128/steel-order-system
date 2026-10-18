// ホームの左の「社内連絡」（docs/intake/screen-design.md「S-01 ホーム」）。
// お知らせの登録・管理は Phase 2（basic-design.md F-24）のため、今は枠と見出しだけを出し、「準備中」と表示する。
// 画面イメージ（01 メインメニュー）のお知らせはサンプルのため、コードには持たない。

import { Icon } from '@/components/layout/icon'
import { Panel } from '@/components/layout/panel'

export function NoticeBoardPlaceholder() {
  return (
    <Panel title="社内連絡" className="min-h-[420px]">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <Icon name="news" className="h-8 w-8 text-neutral-300" />
        <p className="text-sm font-semibold text-neutral-500">社内連絡は準備中です</p>
        <p className="text-xs text-neutral-400">お知らせの登録と一覧の表示は、今後追加します。</p>
      </div>
    </Panel>
  )
}
