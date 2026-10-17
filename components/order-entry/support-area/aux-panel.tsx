// ② 注文内容の下の帯の枠（見出し＋中身）。スタンプ・フリーコメントの 2 つの枠で共通に使う。
// 帯の高さを抑えるため、見出しの行に入力欄（スタンプの番号）や補足を並べられるようにする。

import type { ReactNode } from 'react'

type AuxPanelProps = {
  title: string
  // 見出しの右に出す補足（操作の案内など）
  note?: string
  // 見出しのすぐ右に置く部品（スタンプの番号の欄など）
  headerContent?: ReactNode
  children: ReactNode
}

export function AuxPanel({ title, note, headerContent, children }: AuxPanelProps) {
  return (
    <section className="flex min-h-0 flex-col rounded border border-line bg-white px-3 py-2">
      <div className="mb-1.5 flex items-center gap-3">
        <h2 className="shrink-0 text-sm font-semibold">{title}</h2>
        {headerContent}
        {note && <span className="ml-auto text-[11px] text-neutral-500 dark:text-neutral-400">{note}</span>}
      </div>
      {/* 中身が帯の高さに収まらないときは、枠の中でスクロールする */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  )
}
