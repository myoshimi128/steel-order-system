'use client'

// 番号入力の欄（CodeField）の状態とキー操作を管理するカスタムフック。
//
//   ・入力された番号から選択肢（名称）を引く
//   ・存在しない番号のエラー
//   ・「/」で選択肢の一覧を開き、↑↓ で選んで Enter で確定する（Esc で閉じる）
//   ・Enter で次の欄、Shift+Enter で前の欄へ移る
//
// 一覧には 2 つの形がある。
//   ・検索なし（searchable = false）: 選択肢の少ない欄。一覧を開いたまま番号を打つと、その行を選ぶ
//   ・検索あり（searchable = true） : 売り先・入れ先など件数の多い欄。一覧の上に検索の欄を出し、
//                                     ふりがな・名前で打つたびに候補を絞り込む（lib/code-input/search.ts）
//
// 表示（CodeField / CodeList）はこのフックの戻り値を使うだけにし、
// ロジックを画面の部品から切り離している（CLAUDE.md「UI実装方針」）。

import { useState, type KeyboardEvent } from 'react'
import { findCodeOption, type CodeOption } from '@/lib/code-input/code-option'
import { filterCodeOptions } from '@/lib/code-input/search'
import { isComposing } from './is-composing'

type UseCodeFieldParams<T> = {
  options: readonly CodeOption<T>[]
  // 入力中の番号（親が状態を持つ）
  code: string
  onCodeChange: (code: string) => void
  // Enter / Shift+Enter で次・前の欄へ移るときに呼ぶ
  onNext: () => void
  onPrevious: () => void
  // 一覧に検索の欄を付けるか
  searchable?: boolean
  // 検索ありの一覧を閉じたとき、番号の欄へフォーカスを戻すために呼ぶ
  onReturnFocus?: () => void
}

export function useCodeField<T>({
  options,
  code,
  onCodeChange,
  onNext,
  onPrevious,
  searchable = false,
  onReturnFocus,
}: UseCodeFieldParams<T>) {
  const [isListOpen, setIsListOpen] = useState(false)
  // 一覧で選択中の行（表示している候補 visibleOptions の添字）
  const [highlightIndex, setHighlightIndex] = useState(0)
  // 検索の欄に入力中の文字（検索ありの一覧のみ）
  const [query, setQuery] = useState('')
  // 「存在しない番号」のエラーを表示するか。
  // 入力の途中（「1001」を打つ途中の「100」など）でエラーが点滅しないよう、
  // Enter を押したとき・欄を離れたときに初めて表示する
  const [showInvalid, setShowInvalid] = useState(false)

  const selected = findCodeOption(options, code)
  const isInvalid = code.trim() !== '' && selected === undefined
  const invalidError = showInvalid && isInvalid ? '存在しない番号です' : undefined

  // 一覧に表示する候補。検索ありなら検索の文字で絞り込む
  const visibleOptions = searchable ? filterCodeOptions(options, query) : [...options]

  // 一覧を開く。
  //   検索なし: 今の番号に一致する行を選択した状態で開く
  //   検索あり: 検索の文字を空にして全件を表示し、先頭の行を選択した状態で開く
  function openList() {
    if (searchable) {
      setQuery('')
      setHighlightIndex(0)
    } else {
      const index = selected ? options.indexOf(selected) : 0
      setHighlightIndex(Math.max(index, 0))
    }
    setIsListOpen(true)
  }

  function closeList() {
    setIsListOpen(false)
  }

  // 一覧の行を確定する（Enter・クリック）。番号と名称が入り、次の欄へ進む
  function selectOption(index: number) {
    const option = visibleOptions[index]
    if (!option) {
      return
    }
    onCodeChange(option.code)
    setShowInvalid(false)
    setIsListOpen(false)
    onNext()
  }

  // 一覧を開いているときのキー操作（↑↓・Enter・Esc）。
  // 検索なしでは番号の欄、検索ありでは検索の欄がこのキーを受け取る。
  // 処理したら true を返す
  function handleListKey(event: KeyboardEvent<HTMLInputElement>): boolean {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((index) => Math.min(index + 1, visibleOptions.length - 1))
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex((index) => Math.max(index - 1, 0))
      return true
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      selectOption(highlightIndex)
      return true
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      closeList()
      // 検索の欄から閉じた場合は、番号の欄へ戻る
      if (searchable) {
        onReturnFocus?.()
      }
      return true
    }
    return false
  }

  // --- 番号の欄 ---

  // 番号の欄の文字が変わったとき
  function handleChange(value: string) {
    // 「/」は一覧を開くキーのため、文字としては入力しない（handleKeyDown で処理する）
    const next = value.replaceAll('/', '')
    onCodeChange(next)
    setShowInvalid(false)
    // 検索なしの一覧を開いたまま番号を打った場合は、一致する行を選択状態にする
    const matched = findCodeOption(options, next)
    if (matched && !searchable) {
      setHighlightIndex(options.indexOf(matched))
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (isComposing(event)) {
      return
    }

    // 検索なしの一覧を開いているときは、一覧のキー操作として扱う
    if (isListOpen && !searchable) {
      handleListKey(event)
      return
    }

    if (event.key === '/') {
      event.preventDefault()
      openList()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) {
        onPrevious()
        return
      }
      // 存在しない番号のままでは次へ進ませない（空欄は保存時の必須チェックで扱う）
      if (isInvalid) {
        setShowInvalid(true)
        return
      }
      onNext()
    }
  }

  // 番号の欄を離れたとき。存在しない番号ならエラーを表示する。
  // 検索ありの一覧は、フォーカスが検索の欄へ移るため、ここでは閉じない
  function handleBlur() {
    if (!searchable) {
      setIsListOpen(false)
    }
    if (isInvalid) {
      setShowInvalid(true)
    }
  }

  // --- 検索の欄（検索ありの一覧のみ） ---

  // 検索の文字が変わったら、候補を絞り込み、先頭の行を選択状態にする
  function handleQueryChange(value: string) {
    setQuery(value)
    setHighlightIndex(0)
  }

  function handleQueryKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // 日本語入力の変換中の Enter・↑↓ は変換の操作のため、一覧の操作にしない
    if (isComposing(event)) {
      return
    }
    handleListKey(event)
  }

  // 検索の欄を離れたら一覧を閉じる
  // （一覧の行のクリックは mousedown で既定動作を止めているため、フォーカスは外れない）
  function handleQueryBlur() {
    setIsListOpen(false)
  }

  return {
    selected,
    invalidError,
    isListOpen,
    visibleOptions,
    highlightIndex,
    query,
    handleChange,
    handleKeyDown,
    handleBlur,
    handleQueryChange,
    handleQueryKeyDown,
    handleQueryBlur,
    selectOption,
  }
}
