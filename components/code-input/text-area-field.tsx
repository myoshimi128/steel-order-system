'use client'

// 複数行の文字を入れる欄（フリーコメントなど）。受注登録画面で使う。
//
// テンキーの流れを止めないよう、ほかの欄と同じく Enter で次の欄、Shift+Enter で前の欄へ移る。
// 改行は Ctrl+Enter で入れる（docs/screen-design.md「補助エリア」）。
// 日本語入力の変換を確定する Enter では移動しない（isComposing で判定）。
//
// ↑↓ は画面全体の外枠（useFieldNavigation の handleArrowKeys）で欄の移動に使っている。
// 複数行の文の中では行の移動に使いたいため、カーソルが先頭の行にないときの ↑、
// 最後の行にないときの ↓ は外枠に伝えない（stopPropagation）。

import type { KeyboardEvent, Ref } from 'react'
import { isComposing } from '@/lib/hooks/is-composing'
import { FieldError } from './field-error'

type TextAreaFieldProps = {
  id: string
  value: string
  onValueChange: (value: string) => void
  error?: string
  inputRef?: Ref<HTMLTextAreaElement>
  onNext: () => void
  onPrevious: () => void
  maxLength?: number
  // 表示する行数
  rows?: number
  placeholder?: string
}

export function TextAreaField({
  id,
  value,
  onValueChange,
  error,
  inputRef,
  onNext,
  onPrevious,
  maxLength,
  rows = 4,
  placeholder,
}: TextAreaFieldProps) {
  // Ctrl+Enter: カーソルの位置に改行を入れる（textarea は Ctrl+Enter では改行しないため、自分で入れる）
  function insertLineBreak(textarea: HTMLTextAreaElement) {
    const { selectionStart, selectionEnd } = textarea
    const next = `${value.slice(0, selectionStart)}\n${value.slice(selectionEnd)}`
    if (maxLength !== undefined && next.length > maxLength) {
      return
    }
    onValueChange(next)
    // 値が画面に反映された後に、カーソルを改行の後ろへ置く
    requestAnimationFrame(() => {
      textarea.selectionStart = selectionStart + 1
      textarea.selectionEnd = selectionStart + 1
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (isComposing(event)) {
      return
    }
    const textarea = event.currentTarget

    if (event.key === 'Enter') {
      event.preventDefault()
      if (event.ctrlKey) {
        insertLineBreak(textarea)
      } else if (event.shiftKey) {
        onPrevious()
      } else {
        onNext()
      }
      return
    }

    // 文の中で行を移動できるときは、↑↓ を欄の移動に使わない
    const beforeCursor = value.slice(0, textarea.selectionStart)
    const afterCursor = value.slice(textarea.selectionEnd)
    if (event.key === 'ArrowUp' && beforeCursor.includes('\n')) {
      event.stopPropagation()
    }
    if (event.key === 'ArrowDown' && afterCursor.includes('\n')) {
      event.stopPropagation()
    }
  }

  return (
    <div>
      <textarea
        id={id}
        ref={inputRef}
        rows={rows}
        // 文字を入れる欄の印（明細の行のキー操作を、この欄では普通の文字として扱う）
        data-free-text="true"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-invalid={error !== undefined}
        className={`w-full resize-none rounded border px-2 py-1.5 text-sm outline-none focus:bg-blue-50 dark:bg-neutral-900 dark:focus:bg-blue-950 ${
          error ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
        }`}
      />
      <FieldError message={error} />
    </div>
  )
}
