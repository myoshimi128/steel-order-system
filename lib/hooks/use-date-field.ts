'use client'

// テンキーで入力する日付の欄（DateField）の状態とキー操作を管理するカスタムフック。
//
// 入力中は打った数字をそのまま表示し、Enter・欄を離れたときに日付として解釈する。
//   「1005」→ 今年の 10 月 5 日、「20261005」→ 2026 年 10 月 5 日（lib/order-entry/date.ts）
// 解釈できた日付は「2026/10/05」の形で表示し直す。

import { useState, type KeyboardEvent } from 'react'
import { formatDisplayDate, parseDateInput } from '@/lib/order-entry/date'
import { isComposing } from './is-composing'

type UseDateFieldParams = {
  // 確定した日付 'YYYY-MM-DD'（未入力は ''）。親が状態を持つ
  value: string
  onValueChange: (value: string) => void
  // 「今年」を決めるための今日の日付 'YYYY-MM-DD'
  today: string
  onNext: () => void
  onPrevious: () => void
}

export function useDateField({ value, onValueChange, today, onNext, onPrevious }: UseDateFieldParams) {
  // 入力中の文字。null のときは確定した日付（value）を表示する
  const [draft, setDraft] = useState<string | null>(null)
  const [parseError, setParseError] = useState<string | undefined>(undefined)

  const text = draft ?? formatDisplayDate(value)

  // 入力中の文字を日付として確定する。成功したら true
  function commit(): boolean {
    if (draft === null) {
      // 何も打っていない（表示中の値のまま）
      return true
    }
    if (draft.trim() === '') {
      // 空欄にした場合は未入力に戻す（必須かどうかは保存時に確認する）
      onValueChange('')
      setDraft(null)
      setParseError(undefined)
      return true
    }
    const parsed = parseDateInput(draft, today)
    if (!parsed.ok) {
      setParseError(parsed.error)
      return false
    }
    onValueChange(parsed.value)
    setDraft(null)
    setParseError(undefined)
    return true
  }

  function handleChange(next: string) {
    setDraft(next)
    setParseError(undefined)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isComposing(event) || event.key !== 'Enter') {
      return
    }
    event.preventDefault()
    if (event.shiftKey) {
      commit()
      onPrevious()
      return
    }
    // 日付として解釈できないときは次へ進ませない
    if (commit()) {
      onNext()
    }
  }

  function handleBlur() {
    commit()
  }

  return { text, parseError, handleChange, handleKeyDown, handleBlur }
}
