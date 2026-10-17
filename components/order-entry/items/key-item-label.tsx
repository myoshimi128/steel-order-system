// キー操作の案内の 1 項目（キーの印＋説明）。画面下部の案内と「キー操作の一覧」で共通に使う。

import type { KeyItem } from '@/lib/order-entry/key-guide-items'

export function KeyItemLabel({ item }: { item: KeyItem }) {
  return (
    <span className="flex items-center gap-1">
      {item.keys.map((key, index) => (
        <span key={key} className="flex items-center gap-1">
          {index > 0 && (item.joiner ?? '+')}
          <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-sans font-semibold text-neutral-700">
            {key}
          </kbd>
        </span>
      ))}
      {item.label}
    </span>
  )
}
