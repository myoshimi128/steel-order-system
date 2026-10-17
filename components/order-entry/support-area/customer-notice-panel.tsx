// ③ 伝票の指示の「得意先の注意事項」の枠（表示のみ。受注には保存しない）。
// 得意先・切断方法・加工種別のうち、指定した条件がすべて受注に当てはまった注意事項だけを出す
// （絞り込みは lib/order-entry/notices.ts）。各注意事項には、どの条件で表示されたかの印を付ける。

import type { DisplayedNotice } from '@/lib/order-entry/notices'
import { AuxPanel } from './aux-panel'

type CustomerNoticePanelProps = {
  notices: readonly DisplayedNotice[]
  // 得意先を選んでいるか（選ぶ前は案内を出す）
  hasCustomer: boolean
}

export function CustomerNoticePanel({ notices, hasCustomer }: CustomerNoticePanelProps) {
  return (
    <AuxPanel title="得意先の注意事項">
      {notices.length === 0 ? (
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          {hasCustomer ? 'この受注に当てはまる注意事項はありません' : '売り先を選ぶと表示します'}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notices.map((notice) => (
            <li key={notice.id} className="flex items-start gap-2 text-sm">
              <span className="shrink-0 rounded bg-attention-soft px-1.5 py-0.5 text-[11px] font-semibold text-attention">
                {notice.label}
              </span>
              <span className="whitespace-pre-wrap">{notice.body}</span>
            </li>
          ))}
        </ul>
      )}
    </AuxPanel>
  )
}
