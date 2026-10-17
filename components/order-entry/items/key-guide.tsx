'use client'

// 画面下部に常に表示するキー操作の案内（docs/screen-design.md「キー操作」）。
// よく使うキー（Enter・/・F3・F4・*・+）のうち、今の画面で使えるものだけを並べる。
// 残りのキーは「キー操作の一覧」のボタンで開く一覧（KeyListPopover）で見る。

import { useState } from 'react'
import { frequentKeys } from '@/lib/order-entry/key-guide-items'
import type { OrderEntryStep } from '@/lib/order-entry/order-entry-steps'
import { KeyItemLabel } from './key-item-label'
import { KeyListPopover } from './key-list-popover'

export function KeyGuide({ step }: { step: OrderEntryStep }) {
  const [listOpen, setListOpen] = useState(false)

  return (
    <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
      {frequentKeys(step).map((item) => (
        <KeyItemLabel key={item.label} item={item} />
      ))}
      <button
        type="button"
        // マウスで開く。テンキーの入力の流れには含めない（Enter の順路から外す）
        tabIndex={-1}
        onClick={() => setListOpen((current) => !current)}
        className="rounded px-1.5 py-0.5 text-navy underline hover:bg-navy-soft"
      >
        キー操作の一覧
      </button>
      {listOpen && <KeyListPopover onClose={() => setListOpen(false)} />}
    </div>
  )
}
