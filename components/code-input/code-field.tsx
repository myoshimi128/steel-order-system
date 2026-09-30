'use client'

// 番号入力の欄（番号の欄＋名称表示）。受注登録画面のヘッダー・明細で共通に使う。
//
//   ・番号を打つと、右側に名称が表示される
//   ・「/」で選択肢の一覧（CodeList）を開く。searchable にすると検索の欄が付いた一覧になる
//   ・存在しない番号はエラーを表示し、次の欄へ進ませない
//   ・Enter で次の欄、Shift+Enter で前の欄へ移る
//
// 状態とキー操作は use-code-field.ts に分け、この部品は表示だけを担当する。

import { useRef, type Ref } from 'react'
import type { CodeOption } from '@/lib/code-input/code-option'
import { useCodeField } from '@/lib/hooks/use-code-field'
import { CodeList } from './code-list'
import { FieldError } from './field-error'

type CodeFieldProps<T> = {
  id: string
  // 欄の左に出す項目名。明細のように見出しが別にある場合は省略する
  label?: string
  // 一覧の見出し（省略時は label）
  listTitle?: string
  options: readonly CodeOption<T>[]
  code: string
  onCodeChange: (code: string) => void
  // 保存時の確認などで親から渡すエラー（存在しない番号のエラーより優先して表示する）
  error?: string
  inputRef?: Ref<HTMLInputElement>
  onNext: () => void
  onPrevious: () => void
  // 一覧に検索の欄を付けるか（売り先・入れ先など件数の多い欄）
  searchable?: boolean
  // 番号の欄の幅（Tailwind のクラス）。コードの桁数に合わせる
  codeWidthClass?: string
  // 名称の表示部分の幅（Tailwind のクラス）
  nameWidthClass?: string
}

// 親から受け取った ref（入力順の管理に使う）に要素を渡す。
// ref はコールバック関数の場合とオブジェクトの場合があるため、両方に対応する
function assignRef<E>(ref: Ref<E> | undefined, element: E | null) {
  if (typeof ref === 'function') {
    ref(element)
  } else if (ref) {
    ref.current = element
  }
}

export function CodeField<T>({
  id,
  label,
  listTitle,
  options,
  code,
  onCodeChange,
  error,
  inputRef,
  onNext,
  onPrevious,
  searchable = false,
  codeWidthClass = 'w-12',
  nameWidthClass = 'w-28',
}: CodeFieldProps<T>) {
  // 検索ありの一覧を Esc で閉じたとき、番号の欄へフォーカスを戻すために使う
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  const field = useCodeField({
    options,
    code,
    onCodeChange,
    onNext,
    onPrevious,
    searchable,
    onReturnFocus: () => codeInputRef.current?.focus(),
  })
  const message = error ?? field.invalidError
  const hasError = message !== undefined

  return (
    <div className="flex items-start gap-2">
      {label && (
        <label htmlFor={id} className="mt-2 shrink-0 text-sm text-neutral-600 dark:text-neutral-400">
          {label}
        </label>
      )}
      <div className="relative">
        <div
          className={`flex items-stretch rounded border bg-white dark:bg-neutral-900 ${
            hasError ? 'border-red-500' : 'border-neutral-300 dark:border-neutral-700'
          }`}
        >
          <input
            id={id}
            // 自分用の ref と、親（入力順の管理）から受け取った ref の両方に要素を渡す
            ref={(element) => {
              codeInputRef.current = element
              assignRef(inputRef, element)
            }}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={code}
            onChange={(event) => field.handleChange(event.target.value)}
            onKeyDown={field.handleKeyDown}
            onBlur={field.handleBlur}
            aria-invalid={hasError}
            className={`${codeWidthClass} rounded-l border-r border-neutral-200 bg-neutral-50 px-2 py-1.5 text-center font-semibold tabular-nums outline-none focus:bg-blue-50 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:bg-blue-950`}
          />
          {/* 番号から引いた名称（表示のみ） */}
          <span className={`${nameWidthClass} truncate px-2 py-1.5`}>
            {field.selected?.label ?? ''}
          </span>
        </div>
        {field.isListOpen && (
          <CodeList
            title={listTitle ?? label ?? ''}
            options={field.visibleOptions}
            highlightIndex={field.highlightIndex}
            onSelect={field.selectOption}
            search={
              searchable
                ? {
                    query: field.query,
                    onQueryChange: field.handleQueryChange,
                    onQueryKeyDown: field.handleQueryKeyDown,
                    onQueryBlur: field.handleQueryBlur,
                  }
                : undefined
            }
          />
        )}
        <FieldError message={message} />
      </div>
    </div>
  )
}
