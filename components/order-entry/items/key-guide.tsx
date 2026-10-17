// 画面下部に常に表示するキー操作の案内（docs/screen-design.md「キー操作」）。
// 3 つの画面で使えるキーが違うため、画面ごとに出す案内を切り替える。

import type { OrderEntryStep } from '@/lib/order-entry/order-entry-steps'

// joiner はキーの間に入れる記号。
//   '+' … 同時に押す（Shift + Enter）／続けて押す（行番号 → *）
//   '/' … どちらか（/ または End）
type KeyItem = { keys: string[]; joiner?: '+' | '/'; label: string }

// どの画面でも使うキー
const COMMON_KEYS: KeyItem[] = [
  { keys: ['Enter'], label: '次へ' },
  { keys: ['Shift', 'Enter'], joiner: '+', label: '前へ' },
  { keys: ['/', 'End'], joiner: '/', label: '一覧' },
  { keys: ['F2'], label: '注文書の開閉' },
]

// ② 注文内容（明細）で使うキー。複写・削除は、材料の行にぶら下がる加工の行もまとめて扱う
const ITEM_KEYS: KeyItem[] = [
  { keys: ['*'], label: '直前の行を複写' },
  { keys: ['行番号', '*'], joiner: '+', label: 'その行を複写' },
  { keys: ['+'], label: '加工の行を追加' },
  { keys: ['F3'], label: '行挿入' },
  { keys: ['F4'], label: '行削除' },
]

// ③ 伝票の指示で使うキー
const INSTRUCTION_KEYS: KeyItem[] = [{ keys: ['Ctrl', 'Enter'], joiner: '+', label: 'フリーコメントの改行' }]

export function KeyGuide({ step }: { step: OrderEntryStep }) {
  const items = [
    ...COMMON_KEYS,
    ...(step === 'items' ? ITEM_KEYS : []),
    ...(step === 'instructions' ? INSTRUCTION_KEYS : []),
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
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
      ))}
    </div>
  )
}
