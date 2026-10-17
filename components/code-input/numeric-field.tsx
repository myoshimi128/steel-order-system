'use client'

// 数値を入れる欄（板厚・寸法・数量など）。受注登録画面の明細で共通に使う。
//
// ほかの欄と同じく Enter で次の欄、Shift+Enter で前の欄へ移る。
// テンキーで入力するため、数字と小数点（allowDecimal のとき）以外の文字は入らないようにする。
// 「*」「-」「+」などのキーは、明細の行のキー操作（行の複写・加工の行の追加など）として
// 行の部品（material-row.tsx）が受け取る。

import type { KeyboardEvent, Ref } from 'react'
import { countDigits } from '@/lib/code-lengths'
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
  // 空欄のときに薄く出す文字（欄の見出しを付けられない狭い場所で、何を入れる欄かを示す。例: 外径）
  placeholder?: string
  // 詰めた表示（内側の余白を小さくする）。受注登録の明細の表で使う
  dense?: boolean
  // エラーの文章を欄の下に出すか（明細の行では false にし、行の下にまとめて出す）
  showErrorText?: boolean
  // 上限の桁数（小数点は数えず、数字の数で数える）。上限まで打つと Enter なしで次の欄へ進む。
  // 省略時は上限なし（Enter で進む）
  maxDigits?: number
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
  placeholder,
  dense = false,
  showErrorText = true,
  maxDigits,
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
    const next = halfWidth.replace(pattern, '')
    if (maxDigits === undefined) {
      onValueChange(next)
      return
    }
    // 上限の桁を超える入力は受け付けない（今の値のまま）
    const digits = countDigits(next)
    if (digits > maxDigits) {
      return
    }
    onValueChange(next)
    // 打って上限の桁にそろったら、次の欄へ進む（1.6 は「1」「.」「6」と打った時点で進む）
    if (digits === maxDigits && digits > countDigits(value)) {
      onNext()
    }
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
          placeholder={placeholder}
          className={`w-full rounded border ${dense ? 'px-1 py-1' : 'px-2 py-1.5'} text-right placeholder:text-left placeholder:text-xs placeholder:text-neutral-400 tabular-nums outline-none focus:bg-blue-50 dark:bg-neutral-900 dark:focus:bg-blue-950 ${
            error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
          }`}
        />
        {showErrorText && <FieldError message={error} />}
      </div>
    </div>
  )
}
