'use client'

// 混雑度を選ぶ 4 つのボタン（通常／やや混雑／混雑／要相談）。
// 選ばれているボタンをネイビーの枠で示す（画面イメージ 03 の見た目）。

import { CONGESTION_LABELS, type Congestion } from '@/lib/intake/constants'

const OPTIONS: Congestion[] = ['normal', 'busy', 'crowded', 'consult']

type CongestionSelectorProps = {
  // 読み上げ用に、どの工程の混雑度かを伝える（例: 「レーザーの混雑度」）
  label: string
  value: Congestion
  onChange: (value: Congestion) => void
  disabled?: boolean
}

export function CongestionSelector({ label, value, onChange, disabled }: CongestionSelectorProps) {
  return (
    // role="radiogroup" と role="radio" で、4 つから 1 つを選ぶ欄だと読み上げに伝える
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {OPTIONS.map((option) => {
        const selected = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option)}
            className={`whitespace-nowrap rounded border px-2 py-1 text-xs transition-colors disabled:cursor-not-allowed ${
              selected
                ? // 要相談だけは赤で示す（赤は要相談・至急などにだけ使う）
                  option === 'consult'
                  ? 'border-urgent bg-urgent/10 font-semibold text-urgent ring-1 ring-urgent'
                  : 'border-navy bg-navy-soft font-semibold text-navy ring-1 ring-navy'
                : 'border-line bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-700'
            }`}
          >
            {CONGESTION_LABELS[option]}
          </button>
        )
      })}
    </div>
  )
}
