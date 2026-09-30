// 明細の仕入単価（上段）と仕入金額（下段）の表示。自動計算の欄のため、入力はしない。
//   ・価格マスタの行を取得中は「…」
//   ・別途見積もりは「別途見積もり」と表示し、仕入金額は「—」（仕入単価は空欄のまま登録する）

import type { ReactNode } from 'react'
import type { ItemCalculation } from '@/lib/order-entry/calculate-item'

type PriceCellProps = {
  calculation: ItemCalculation
  // 価格マスタの行を取得できなかった場合のメッセージ
  pricingError?: string
}

// 3 桁ごとにカンマを入れる（小数がある単価は小数第 2 位まで）
function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP', { maximumFractionDigits: 2 })
}

const AUTO_CELL_CLASS =
  'flex h-[34px] items-center justify-end rounded bg-neutral-100 px-2 tabular-nums dark:bg-neutral-800'

export function PriceCell({ calculation, pricingError }: PriceCellProps) {
  let unitPrice: ReactNode = ''
  let amount: ReactNode = ''

  if (pricingError) {
    unitPrice = <span className="text-xs text-red-600">取得できません</span>
  } else if (calculation.status === 'loading') {
    unitPrice = <span className="text-neutral-400">…</span>
  } else if (calculation.status === 'quote') {
    unitPrice = (
      <span
        title={calculation.reason}
        className="rounded border border-amber-400 bg-amber-50 px-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      >
        別途見積もり
      </span>
    )
    amount = '—'
  } else if (calculation.status === 'priced') {
    unitPrice = `${formatNumber(calculation.unitPrice)} /${calculation.priceUnit}`
    amount = formatNumber(calculation.amount)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className={AUTO_CELL_CLASS}>{unitPrice}</span>
      <span className={AUTO_CELL_CLASS}>{amount}</span>
    </div>
  )
}
