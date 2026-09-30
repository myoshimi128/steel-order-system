// 明細の行の下に出すエラー・警告の文章。
// 明細の欄は狭いため、欄には枠の色だけでエラーを示し、文章はここにまとめて出す。
// 同じ文章が複数の欄で出る場合は 1 回だけ表示する。

import type { ItemErrors } from '@/lib/order-entry/item-types'

type RowMessagesProps = {
  errors: ItemErrors
}

export function RowMessages({ errors }: RowMessagesProps) {
  const messages = [...new Set(Object.values(errors).filter((message) => message))]
  if (messages.length === 0) {
    return null
  }
  return (
    <ul className="col-span-full px-12 pt-1 text-xs text-red-600 dark:text-red-400">
      {messages.map((message) => (
        <li key={message}>{message}</li>
      ))}
    </ul>
  )
}
