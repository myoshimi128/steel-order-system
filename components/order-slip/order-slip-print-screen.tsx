'use client'

// 現場用伝票の印刷の画面（/orders/print）。
// 上に操作の帯（画面だけ）、その下に伝票のページ（A4 の横）を並べる。印刷すると伝票のページだけが出る。
// 伝票の行・ページ分け・合計はサーバー（page.tsx）で組み立てて渡し、ここでは印刷の流れ（use-slip-print.ts）だけを持つ。

import type { LoadedOrderSlip } from '@/lib/order-slip/load-order-slip'
import type { SlipLineMarkSummary, SlipTotals } from '@/lib/order-slip/slip-lines'
import type { SlipCopyKind, SlipLine } from '@/lib/order-slip/types'
import { useSlipPrint } from '@/lib/order-slip/use-slip-print'
import { SlipSheet } from './slip-sheet'
import { SlipToolbar } from './slip-toolbar'

type OrderSlipPrintScreenProps = {
  slip: LoadedOrderSlip
  copyKind: SlipCopyKind
  pages: readonly (readonly SlipLine[])[]
  lineMarks: readonly SlipLineMarkSummary[]
  totals: SlipTotals
  issueDate: string
  changedSinceLastPrint: boolean
  // 開いたらすぐに印刷する（登録の直後）
  auto: boolean
}

export function OrderSlipPrintScreen({
  slip,
  copyKind,
  pages,
  lineMarks,
  totals,
  issueDate,
  changedSinceLastPrint,
  auto,
}: OrderSlipPrintScreenProps) {
  const summary = slip.prints[copyKind]
  const { issueCount, printing, error, print } = useSlipPrint({
    orderId: slip.id,
    copyKind,
    initialCount: summary.count,
    auto,
  })

  return (
    <main className="flex flex-1 flex-col gap-4 bg-canvas px-6 py-5 print:block print:bg-white print:p-0">
      <SlipToolbar
        orderNo={slip.orderNo}
        copyKind={copyKind}
        printing={printing}
        error={error}
        lastPrintedAt={summary.lastPrintedAt}
        changedSinceLastPrint={changedSinceLastPrint}
        onPrint={() => void print()}
      />

      <div className="slip-sheets flex flex-col items-center gap-6">
        {pages.map((lines, index) => (
          <SlipSheet
            key={index}
            slip={slip}
            copyKind={copyKind}
            lines={lines}
            lineMarks={lineMarks}
            totals={totals}
            issueDate={issueDate}
            issueCount={issueCount}
            pageNo={index + 1}
            pageCount={pages.length}
          />
        ))}
      </div>
    </main>
  )
}
