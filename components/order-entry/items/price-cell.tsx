// 明細の仕入単価（上段）と仕入金額（下段）の表示。自動計算の欄のため、入力はしない。
//   ・価格マスタの行を取得中は「…」
//   ・取得に失敗した場合は「取得できません」
//   ・単価を決められない場合（ショット未入力・取り扱いのない板厚など）は「未確定」と表示する
//   ・別途見積もりは「別途見積もり」と表示し、仕入金額は「—」（仕入単価は空欄のまま登録する）
// 重量は単価と切り離して計算しており、この欄が「未確定」「別途見積もり」でも重量の欄には表示される。
// 印の上にマウスを置くと、理由（reason）が表示される。

import type { ReactNode } from 'react'
import type { ItemPrice } from '@/lib/order-entry/calculate-item'

type PriceCellProps = {
  price: ItemPrice
  // 価格マスタの行を取得できなかった場合のメッセージ
  pricingError?: string
}

// 3 桁ごとにカンマを入れる（小数がある単価は小数第 2 位まで）
function formatNumber(value: number): string {
  return value.toLocaleString('ja-JP', { maximumFractionDigits: 2 })
}

const AUTO_CELL_CLASS =
  'flex h-[34px] items-center justify-end rounded bg-neutral-100 px-2 tabular-nums dark:bg-neutral-800'

export function PriceCell({ price, pricingError }: PriceCellProps) {
  let unitPrice: ReactNode = ''
  let amount: ReactNode = ''

  if (pricingError && price.status === 'loading') {
    // 取得に失敗した条件は、取得中（loading）のまま止まるため、失敗のメッセージを優先して出す
    unitPrice = (
      <span title={pricingError} className="text-xs text-red-600">
        取得できません
      </span>
    )
    amount = '—'
  } else if (price.status === 'loading') {
    unitPrice = <span className="text-neutral-400">…</span>
  } else if (price.status === 'undetermined') {
    unitPrice = (
      <span
        title={price.reason}
        className="rounded border border-neutral-400 bg-white px-1.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300"
      >
        未確定
      </span>
    )
    amount = '—'
  } else if (price.status === 'quote') {
    unitPrice = (
      <span
        title={price.reason}
        className="rounded border border-amber-400 bg-amber-50 px-1.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      >
        別途見積もり
      </span>
    )
    amount = '—'
  } else if (price.status === 'priced') {
    unitPrice = `${formatNumber(price.unitPrice)} /${price.priceUnit}`
    amount = formatNumber(price.amount)
  }

  return (
    <div className="flex flex-col gap-1">
      <span className={AUTO_CELL_CLASS}>{unitPrice}</span>
      <span className={AUTO_CELL_CLASS}>{amount}</span>
    </div>
  )
}
