// 番号入力の欄（CodeField）で「/」を押したときに開く、選択肢の一覧。
//
// 検索の有無を切り替えられる。
//   ・検索なし: 選択肢の少ない欄。キー操作（番号・↑↓・Enter・Esc）は番号の欄が受け取る
//   ・検索あり: 売り先・入れ先など件数の多い欄。一覧の上に検索の欄を出し、
//               検索の欄がキー操作（文字・↑↓・Enter・Esc）を受け取る
// どちらもロジックは use-code-field.ts にあり、この部品は表示だけを担当する。

import type { KeyboardEvent } from 'react'
import type { CodeOption } from '@/lib/code-input/code-option'

// 検索ありの一覧で使う props
type SearchProps = {
  query: string
  onQueryChange: (value: string) => void
  onQueryKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onQueryBlur: () => void
}

type CodeListProps<T> = {
  // 一覧の見出し（例: 「売り先」）
  title: string
  // 表示する候補（検索ありの場合は絞り込んだ後のもの）
  options: readonly CodeOption<T>[]
  // 選択中の行（options の添字）
  highlightIndex: number
  onSelect: (index: number) => void
  // 検索の欄を付ける場合に渡す。省略すると検索なしの一覧になる
  search?: SearchProps
}

export function CodeList<T>({ title, options, highlightIndex, onSelect, search }: CodeListProps<T>) {
  return (
    <div
      className={`absolute top-full left-0 z-20 mt-1 rounded border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900 ${
        search ? 'w-[28rem]' : 'w-64'
      }`}
    >
      <p className="border-b border-neutral-200 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        {search
          ? `${title}　ふりがな・名前で検索、↑↓ で選んで Enter（Esc で閉じる）`
          : `${title}　番号か ↑↓ で選んで Enter`}
      </p>

      {search && (
        <div className="border-b border-neutral-200 p-2 dark:border-neutral-800">
          <input
            type="text"
            // 一覧を開いたらすぐに検索の文字を打てるよう、検索の欄にフォーカスを当てる
            autoFocus
            autoComplete="off"
            value={search.query}
            placeholder="ふりがな・名前"
            aria-label={`${title}の検索`}
            onChange={(event) => search.onQueryChange(event.target.value)}
            onKeyDown={search.onQueryKeyDown}
            onBlur={search.onQueryBlur}
            className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
      )}

      {options.length === 0 ? (
        <p className="px-3 py-2 text-sm text-neutral-500">
          {search ? '一致する候補がありません' : '選択肢がありません'}
        </p>
      ) : (
        <ul role="listbox" className="max-h-72 overflow-y-auto">
          {options.map((option, index) => (
            <li
              key={option.code}
              role="option"
              aria-selected={index === highlightIndex}
              // 選択中の行が見える位置までスクロールする（↑↓ で一覧の外へ出たとき）
              ref={(element) => {
                if (element && index === highlightIndex) {
                  element.scrollIntoView({ block: 'nearest' })
                }
              }}
              // mousedown の既定動作（入力欄からフォーカスが外れる）を止める。
              // フォーカスが外れると一覧が閉じてしまい、クリックで選べなくなるため
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(index)}
              className={`flex cursor-pointer gap-3 px-3 py-1.5 text-sm ${
                index === highlightIndex
                  ? 'bg-blue-50 font-semibold dark:bg-blue-950'
                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <span className="w-12 shrink-0 text-right tabular-nums">{option.code}</span>
              <span className="truncate">{option.label}</span>
              {search && option.kana && (
                <span className="ml-auto shrink-0 text-xs text-neutral-400">{option.kana}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
