// ① 受注情報の 1 項目分の枠。項目名を欄の上に置き、右に補足（操作の案内など）を出す
// （受付〜受注登録の画面イメージ S-06c の形）。必須の項目には赤い「*」を付ける。

import type { ReactNode } from 'react'

type FormItemProps = {
  label: string
  // 項目名と結びつける欄の ID（項目名を押すと欄にカーソルが移る）
  htmlFor?: string
  required?: boolean
  // 項目名の右に出す補足
  note?: string
  children: ReactNode
  className?: string
}

export function FormItem({ label, htmlFor, required = false, note, children, className = '' }: FormItemProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-neutral-700">
          {label}
          {required && <span className="ml-1 text-urgent">*</span>}
        </label>
        {note && <span className="text-xs text-neutral-400">{note}</span>}
      </div>
      {children}
    </div>
  )
}
