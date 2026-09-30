'use client'

// 文字を入れる欄（担当者・工事名・継手番号など）。受注登録画面で共通に使う。
//
// ほかの欄と同じく Enter で次の欄、Shift+Enter で前の欄へ移る。
// 日本語入力の変換を確定する Enter では移動しない（isComposing で判定）。
// 番号の欄と違い、「/」「*」「+」「-」は普通の文字として入力できる。

import type { KeyboardEvent, Ref } from 'react'
import { isComposing } from '@/lib/hooks/is-composing'
import { FieldError } from './field-error'

type TextFieldProps = {
  id: string
  label?: string
  value: string
  onValueChange: (value: string) => void
  error?: string
  inputRef?: Ref<HTMLInputElement>
  onNext: () => void
  onPrevious: () => void
  maxLength?: number
  // 入力欄の幅（Tailwind のクラス）
  widthClass?: string
  // エラーの文章を欄の下に出すか（明細の行では false にし、行の下にまとめて出す）
  showErrorText?: boolean
}

export function TextField({
  id,
  label,
  value,
  onValueChange,
  error,
  inputRef,
  onNext,
  onPrevious,
  maxLength,
  widthClass = 'w-40',
  showErrorText = true,
}: TextFieldProps) {
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

  return (
    <div className="flex items-start gap-2">
      {label && (
        <label htmlFor={id} className="mt-2 shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
          {label}
        </label>
      )}
      <div className={widthClass}>
        <input
          id={id}
          ref={inputRef}
          type="text"
          autoComplete="off"
          // 文字を入れる欄の印。明細の行のキー操作（「*」「-」など）を、この欄では普通の文字として扱う
          data-free-text="true"
          value={value}
          maxLength={maxLength}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-invalid={error !== undefined}
          className={`w-full rounded border px-2 py-1.5 outline-none focus:bg-blue-50 dark:bg-neutral-900 dark:focus:bg-blue-950 ${
            error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
          }`}
        />
        {showErrorText && <FieldError message={error} />}
      </div>
    </div>
  )
}
