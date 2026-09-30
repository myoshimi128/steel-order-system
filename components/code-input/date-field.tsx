'use client'

// テンキーで入力する日付の欄。受注日・納期などで共通に使う。
//   「1005」→ 今年の 10 月 5 日、「20261005」→ 2026 年 10 月 5 日
// 状態とキー操作は use-date-field.ts に分け、この部品は表示だけを担当する。

import type { Ref } from 'react'
import { useDateField } from '@/lib/hooks/use-date-field'
import { FieldError } from './field-error'

type DateFieldProps = {
  id: string
  label?: string
  // 確定した日付 'YYYY-MM-DD'（未入力は ''）
  value: string
  onValueChange: (value: string) => void
  // 「今年」を決めるための今日の日付 'YYYY-MM-DD'
  today: string
  // 保存時の確認などで親から渡すエラー
  error?: string
  inputRef?: Ref<HTMLInputElement>
  onNext: () => void
  onPrevious: () => void
}

export function DateField({
  id,
  label,
  value,
  onValueChange,
  today,
  error,
  inputRef,
  onNext,
  onPrevious,
}: DateFieldProps) {
  const field = useDateField({ value, onValueChange, today, onNext, onPrevious })
  // 日付として解釈できないエラーを優先して表示する（入力の誤りをその場で直せるように）
  const message = field.parseError ?? error

  return (
    <div className="flex items-start gap-2">
      {label && (
        <label htmlFor={id} className="mt-2 shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
          {label}
        </label>
      )}
      <div>
        <input
          id={id}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={field.text}
          placeholder="月日4桁"
          onChange={(event) => field.handleChange(event.target.value)}
          onKeyDown={field.handleKeyDown}
          onBlur={field.handleBlur}
          aria-invalid={message !== undefined}
          className={`w-32 rounded border px-2 py-1.5 tabular-nums outline-none focus:bg-blue-50 dark:bg-neutral-900 dark:focus:bg-blue-950 ${
            message ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
          }`}
        />
        <FieldError message={message} />
      </div>
    </div>
  )
}
