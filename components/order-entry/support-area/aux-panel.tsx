// ③ 伝票の指示の枠（見出し＋中身）。注意事項・スタンプ・フリーコメントの 3 つの枠で共通に使う。

import type { ReactNode } from 'react'

type AuxPanelProps = {
  title: string
  // 見出しの右に出す補足（操作の案内など）
  note?: string
  children: ReactNode
}

export function AuxPanel({ title, note, children }: AuxPanelProps) {
  return (
    <section className="flex min-h-0 flex-col rounded border border-line bg-white p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note && <span className="text-[11px] text-neutral-500 dark:text-neutral-400">{note}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  )
}
