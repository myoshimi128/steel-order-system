// 白いカードの枠（見出しの左にネイビーの縦線）。ホーム・納期連絡などの画面の区画に使う。
// 画面イメージ（01 メインメニュー・03 納期連絡）の「| 社内連絡」「| 目安納期」の見た目。

import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  // 見出しの右に出すもの（「受注から出荷までの目安」の説明、「＋ 工程を追加」のボタンなど）
  aside?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, aside, children, className = '' }: PanelProps) {
  return (
    <section className={`flex flex-col rounded border border-line bg-white ${className}`}>
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="border-l-[3px] border-navy pl-2.5 text-base font-bold leading-tight text-neutral-900">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  )
}
