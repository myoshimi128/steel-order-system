// 送り状の画面と印刷で使う、数と文の形（docs/screen-design.md「送り状発行」）。画面や DB に依存しない純粋な関数。

import { deliveryText, monthDayWithWeekday } from '@/lib/order-slip/slip-format'

// 重量（kg）を「1,234.50」にする。わからなければ空
export function weightText(value: number | null): string {
  return value === null ? '' : value.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// 数量（枚）を「1,234」にする
export function quantityText(value: number): string {
  return value.toLocaleString('ja-JP')
}

// 納期の文。確定・仮納期は「10/30（金）」（仮納期は「仮」を前に付ける）、後報・最短出荷は種別そのもの
export function dueDateText(dueDateType: string, dueDate: string | null): string {
  if (dueDate === null || (dueDateType !== '確定' && dueDateType !== '仮納期')) return dueDateType
  const date = monthDayWithWeekday(dueDate)
  return dueDateType === '仮納期' ? `仮 ${date}` : date
}

// 配達の文（フリーは入力した文字を添える）。現場用伝票と同じ
export { deliveryText }

// 得意先（客先担当）の文
export function customerText(name: string, contact: string | null): string {
  return contact ? `${name}（${contact}）` : name
}
