'use client'

// 番号入力の欄（CodeField）の状態とキー操作を管理するカスタムフック。
//
//   ・入力された番号から選択肢（名称）を引く
//   ・存在しない番号のエラー
//   ・「/」で選択肢の一覧を開き、↑↓ で選んで Enter で確定する（Esc で閉じる）
//   ・Enter で次の欄、Shift+Enter で前の欄へ移る
//   ・上限の桁（maxLength）まで打つと、Enter を押さなくても次の欄へ進む。
//     存在しない番号なら進まずにエラーを出す（判定は lib/code-input/auto-advance.ts）
//   ・command を渡した欄では、そのキー（「-」）で始まる入力を番号ではなく操作として扱う
//     （明細の切断・区分の「-」→ 行番号 → Enter で、その行を複写する）
//
// 一覧には 2 つの形がある。
//   ・検索なし（searchable = false）: 選択肢の少ない欄。一覧を開いたまま番号を打つと、その行を選ぶ
//   ・検索あり（searchable = true） : 売り先・入れ先など件数の多い欄。一覧の上に検索の欄を出し、
//                                     ふりがな・名前で打つたびに候補を絞り込む（lib/code-input/search.ts）
//
// 表示（CodeField / CodeList）はこのフックの戻り値を使うだけにし、
// ロジックを画面の部品から切り離している（CLAUDE.md「UI実装方針」）。

import { useState, type KeyboardEvent } from 'react'
import { codeAdvance } from '@/lib/code-input/auto-advance'
import { findCodeOption, type CodeOption } from '@/lib/code-input/code-option'
import { filterCodeOptions } from '@/lib/code-input/search'
import { isComposing } from './is-composing'

// 番号の代わりに打つ操作（例: 「-」→ 行番号 → Enter で行を複写）
export type CodeFieldCommand = {
  // 操作を始めるキー（例: '-'）
  key: string
  // Enter を押したときに呼ぶ。キーの後に打った数字を渡す
  onSubmit: (digits: string) => void
}

type UseCodeFieldParams<T> = {
  options: readonly CodeOption<T>[]
  // 入力中の番号（親が状態を持つ）
  code: string
  onCodeChange: (code: string) => void
  // Enter / Shift+Enter で次・前の欄へ移るときに呼ぶ。
  // onNext には確定した番号を渡す（自動で次へ進むときは、親の状態がまだ更新されていないため）
  onNext: (code: string) => void
  onPrevious: () => void
  // 一覧に検索の欄を付けるか
  searchable?: boolean
  // 検索ありの一覧を閉じたとき、番号の欄へフォーカスを戻すために呼ぶ
  onReturnFocus?: () => void
  // 上限の桁数。上限まで打つと自動で次の欄へ進む（省略時は Enter でだけ進む）
  maxLength?: number
  // 番号の代わりに打つ操作
  command?: CodeFieldCommand
}

export function useCodeField<T>({
  options,
  code,
  onCodeChange,
  onNext,
  onPrevious,
  searchable = false,
  onReturnFocus,
  maxLength,
  command,
}: UseCodeFieldParams<T>) {
  const [isListOpen, setIsListOpen] = useState(false)
  // 一覧で選択中の行（表示している候補 visibleOptions の添字）
  const [highlightIndex, setHighlightIndex] = useState(0)
  // 検索の欄に入力中の文字（検索ありの一覧のみ）
  const [query, setQuery] = useState('')
  // 「存在しない番号」のエラーを表示するか。
  // 入力の途中（「1001」を打つ途中の「100」など）でエラーが点滅しないよう、
  // Enter を押したとき・上限の桁まで打ったとき・欄を離れたときに初めて表示する
  const [showInvalid, setShowInvalid] = useState(false)

  // 操作（「-」→ 行番号）を入力中か。このときは番号として扱わない
  const isCommand = command !== undefined && code.startsWith(command.key)
  const selected = isCommand ? undefined : findCodeOption(options, code)
  const isInvalid = !isCommand && code.trim() !== '' && selected === undefined
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
    onNext(option.code)
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
    let next = value.replaceAll('/', '')

    // 操作を入力中なら、キーの後ろは数字だけにする。桁の上限・自動で次へは使わない
    if (command && next.startsWith(command.key)) {
      onCodeChange(command.key + next.slice(command.key.length).replace(/[^0-9]/g, ''))
      return
    }

    // 上限の桁を超える分は入れない
    if (maxLength !== undefined) {
      next = next.slice(0, maxLength)
    }
    onCodeChange(next)
    setShowInvalid(false)
    // 検索なしの一覧を開いたまま番号を打った場合は、一致する行を選択状態にする
    const matched = findCodeOption(options, next)
    if (matched && !searchable) {
      setHighlightIndex(options.indexOf(matched))
    }

    // 打って桁が増えたときだけ、自動で次へ進むかを判定する
    // （消して短くしたときや、桁がそろった欄に戻ってきただけのときは進まない）
    if (maxLength !== undefined && next.length > code.length) {
      const advance = codeAdvance(options, next, maxLength)
      if (advance === 'next') {
        setIsListOpen(false)
        onNext(next)
      } else if (advance === 'invalid') {
        setShowInvalid(true)
      }
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
    // 操作を始めるキー（「-」）。欄の中身を消して、そのキーだけにする
    if (command && event.key === command.key && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault()
      onCodeChange(command.key)
      setShowInvalid(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) {
        onPrevious()
        return
      }
      // 操作を入力中なら、打った数字を渡して操作を行う
      if (command && isCommand) {
        command.onSubmit(code.slice(command.key.length))
        return
      }
      // 存在しない番号のままでは次へ進ませない（空欄は保存時の必須チェックで扱う）
      if (isInvalid) {
        setShowInvalid(true)
        return
      }
      onNext(code)
    }
  }

  // 番号の欄を離れたとき。存在しない番号ならエラーを表示する。
  // 検索ありの一覧は、フォーカスが検索の欄へ移るため、ここでは閉じない
  function handleBlur() {
    if (!searchable) {
      setIsListOpen(false)
    }
    // 操作を打ちかけたまま欄を離れたら、操作をやめる（欄を空に戻す）
    if (isCommand) {
      onCodeChange('')
      return
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
