'use client'

// 選択肢の少ない番号の欄（加工場所・部材区分）を、ボタン状に並べて見せる欄
// （受付〜受注登録の画面イメージ S-06c の形）。
//   ・左に番号の欄を置き、テンキーで番号を打って選ぶ（入力の仕組みは CodeField のまま）
//   ・右に選択肢を「[番号] 名前」のボタン状に並べ、選ばれているものをネイビーの枠で示す。マウスで押しても選べる
// ボタンはテンキーの入力の流れに含めない（tabIndex={-1}）。番号の欄だけが入力順に入る。

import { CodeField } from '@/components/code-input/code-field'
import type { CodeOption } from '@/lib/code-input/code-option'
import type { NavigationFieldProps } from '@/components/order-entry/items/dimension-props'

type CodeChipsFieldProps<T> = NavigationFieldProps & {
  listTitle: string
  options: readonly CodeOption<T>[]
  code: string
  onCodeChange: (code: string) => void
  error?: string
  // 上限の桁数（lib/code-lengths.ts）
  maxLength?: number
}

export function CodeChipsField<T>({ options, code, onCodeChange, ...props }: CodeChipsFieldProps<T>) {
  const selectedCode = code.trim()
  return (
    <div className="flex items-start gap-3">
      <CodeField {...props} options={options} code={code} onCodeChange={onCodeChange} codeWidthClass="w-10" hideName />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.code === selectedCode
          return (
            <button
              key={option.code}
              type="button"
              tabIndex={-1}
              onClick={() => onCodeChange(option.code)}
              aria-pressed={selected}
              className={`flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm ${
                selected
                  ? 'border-2 border-navy bg-navy-soft font-semibold text-navy'
                  : 'border-line bg-white text-neutral-700 hover:bg-canvas'
              }`}
            >
              <span
                className={`rounded border px-1 text-[11px] tabular-nums ${
                  selected ? 'border-navy' : 'border-neutral-300 text-neutral-500'
                }`}
              >
                {option.code}
              </span>
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
