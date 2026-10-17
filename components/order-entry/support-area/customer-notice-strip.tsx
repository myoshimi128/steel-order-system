'use client'

// ② 注文内容の画面で、受注情報の要約の下に固定表示する「得意先の注意事項」の帯。
// 明細を打ちながら見えるようにするため、表の上に置く（docs/screen-design.md「得意先の注意事項」）。
// 件数が多いときは 2 件まで出し、残りは「ほか○件」で開けるようにする。
// ③ 伝票の指示の画面では、スタンプ・フリーコメントと並べて全件を出す（customer-notice-panel.tsx）。

import { useState } from 'react'
import type { DisplayedNotice } from '@/lib/order-entry/notices'

// 閉じているときに出す件数
const COLLAPSED_COUNT = 2

export function CustomerNoticeStrip({ notices }: { notices: readonly DisplayedNotice[] }) {
  const [expanded, setExpanded] = useState(false)
  if (notices.length === 0) {
    return null
  }
  const visible = expanded ? notices : notices.slice(0, COLLAPSED_COUNT)
  const hiddenCount = notices.length - visible.length

  return (
    <div className="flex items-start gap-3 border-b border-line bg-attention-soft px-4 py-2 text-[13px]">
      <span className="shrink-0 pt-0.5 text-xs font-semibold text-attention">得意先の注意事項</span>
      <ul className="flex min-w-0 flex-1 flex-col gap-1">
        {visible.map((notice) => (
          <li key={notice.id} className="flex items-start gap-2">
            <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[11px] font-semibold text-attention">
              {notice.label}
            </span>
            <span className="whitespace-pre-wrap">{notice.body}</span>
          </li>
        ))}
      </ul>
      {(hiddenCount > 0 || expanded) && (
        // マウスで開閉する（テンキーの入力の流れには含めないため、tabIndex で Enter の順路から外す）
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setExpanded((current) => !current)}
          className="shrink-0 text-xs text-attention underline"
        >
          {expanded ? '閉じる' : `ほか ${hiddenCount} 件`}
        </button>
      )}
    </div>
  )
}
