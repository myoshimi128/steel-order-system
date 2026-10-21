// ① 受注情報の 1 項目分の枠。項目名を欄の上に置き、右に補足（操作の案内など）を出す
// （受付〜受注登録の画面イメージ S-06c の形）。必須の項目には赤い「*」を付ける。
// fromIntake を付けると、受付から入った値のままの欄として、枠の背景を薄い青にし、項目名の横に「受付の値」と出す
// （手で直すと親が fromIntake を外し、通常の見た目に戻る）。

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
  fromIntake?: boolean
}

export function FormItem({
  label,
  htmlFor,
  required = false,
  note,
  children,
  className = '',
  fromIntake = false,
}: FormItemProps) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-1.5 ${
        fromIntake ? '-mx-2 -my-1 rounded bg-intake-soft px-2 py-1 ring-1 ring-intake/20' : ''
      } ${className}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-neutral-700">
          {label}
          {required && <span className="ml-1 text-urgent">*</span>}
          {fromIntake && <span className="ml-2 text-[11px] font-normal text-intake">受付の値</span>}
        </label>
        {note && <span className="text-xs text-neutral-400">{note}</span>}
      </div>
      {children}
    </div>
  )
}
