'use client'

// 「キー操作の一覧」。画面下部の案内の上に開き、受注登録画面で使える全部のキーを画面ごとにまとめて出す。
// 外側をクリックするか、閉じるボタンで閉じる。入力中の欄からカーソルは動かさない（表示のみ）。

import { ALL_KEY_GROUPS } from '@/lib/order-entry/key-guide-items'
import { KeyItemLabel } from './key-item-label'

export function KeyListPopover({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* 外側のクリックで閉じるための、画面全体を覆う透明の層 */}
      <div aria-hidden className="fixed inset-0 z-30" onClick={onClose} />
      <div
        role="dialog"
        aria-label="キー操作の一覧"
        className="absolute bottom-full left-0 z-40 mb-2 w-[32rem] rounded border border-line bg-white p-4 text-neutral-700 shadow-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy">キー操作の一覧</h2>
          <button
            type="button"
            tabIndex={-1}
            onClick={onClose}
            className="rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-navy-soft"
          >
            閉じる
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {ALL_KEY_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-1 text-xs font-semibold text-neutral-500">{group.title}</h3>
              <ul className="flex flex-col gap-1.5 text-xs">
                {group.items.map((item) => (
                  <li key={item.label}>
                    <KeyItemLabel item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
