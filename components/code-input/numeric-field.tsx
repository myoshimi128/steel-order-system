'use client'

// 数値を入れる欄（板厚・寸法・数量など）。受注登録画面の明細で共通に使う。
//
// ほかの欄と同じく Enter で次の欄、Shift+Enter で前の欄へ移る。
// テンキーで入力するため、数字と小数点（allowDecimal のとき）以外の文字は入らないようにする。
// 「*」「-」「+」などのキーは、明細の行のキー操作（行の複写・摘要への移動など）として
// 行の部品（material-row.tsx）が受け取る。

import type { KeyboardEvent, Ref } from 'react'
import { isComposing } from '@/lib/hooks/is-composing'
import { FieldError } from './field-error'

type NumericFieldProps = {
  id: string
  // 欄の前に出す短い見出し（「直径」など）。省略可
  label?: string
  value: string
  onValueChange: (value: string) => void
  error?: string
  inputRef?: Ref<HTMLInputElement>
  onNext: () => void
  onPrevious: () => void
  // 小数を入力できるか（板厚・寸法は可、数量は不可）
  allowDecimal?: boolean
  // 入力欄の幅（Tailwind のクラス）
  widthClass?: string
  // エラーの文章を欄の下に出すか（明細の行では false にし、行の下にまとめて出す）
  showErrorText?: boolean
}

export function NumericField({
  id,
  label,
  value,
  onValueChange,
  error,
  inputRef,
  onNext,
  onPrevious,
  allowDecimal = false,
  widthClass = 'w-20',
  showErrorText = true,
}: NumericFieldProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isComposing(event) || event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    if (event.shiftKey) {
      onPrevious()
    } else {
      onNext()
    }
  }

  // 数字（と小数点）以外の文字を取り除く。全角数字は半角にそろえる（NFKC 正規化）
  function handleChange(text: string) {
    const halfWidth = text.normalize('NFKC')
    const pattern = allowDecimal ? /[^0-9.]/g : /[^0-9]/g
    onValueChange(halfWidth.replace(pattern, ''))
  }

  return (
    <div className="flex items-center gap-1">
      {label && (
        <label htmlFor={id} className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
          {label}
        </label>
      )}
      <div className={widthClass}>
        <input
          id={id}
          ref={inputRef}
          type="text"
          inputMode={allowDecimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={value}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-invalid={error !== undefined}
          className={`w-full rounded border px-2 py-1.5 text-right tabular-nums outline-none focus:bg-blue-50 dark:bg-neutral-900 dark:focus:bg-blue-950 ${
            error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
          }`}
        />
        {showErrorText && <FieldError message={error} />}
      </div>
    </div>
  )
}
