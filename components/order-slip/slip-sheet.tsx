// 現場用伝票の 1 ページ（A4 の横）。
//
//   上: 上部の項目（SlipHeader。どのページにも出す）
//   左: 明細の表（SlipItemsTable）と、その下の合計（最後のページ）か「次のページに続きます」
//   右: 現場への指示（SlipInstructions。ショット加工・材質ライン・スタンプ・摘要。どのページにも出す）
// 大きさは CSS の mm で決め、画面でも印刷と同じ大きさで見せる（印刷の決まりは app/globals.css の .slip-sheet）。

import type { LoadedOrderSlip } from '@/lib/order-slip/load-order-slip'
import type { SlipLineMarkSummary, SlipTotals } from '@/lib/order-slip/slip-lines'
import type { SlipCopyKind, SlipLine } from '@/lib/order-slip/types'
import { SlipHeader } from './slip-header'
import { SlipInstructions } from './slip-instructions'
import { SlipItemsTable } from './slip-items-table'

type SlipSheetProps = {
  slip: LoadedOrderSlip
  copyKind: SlipCopyKind
  lines: readonly SlipLine[]
  lineMarks: readonly SlipLineMarkSummary[]
  totals: SlipTotals
  issueDate: string
  issueCount: number
  pageNo: number
  pageCount: number
}

export function SlipSheet({ slip, copyKind, lines, lineMarks, totals, issueDate, issueCount, pageNo, pageCount }: SlipSheetProps) {
  const showPrices = copyKind === '単価記入用'
  const isLastPage = pageNo === pageCount

  return (
    <section className="slip-sheet flex flex-col gap-2 bg-white text-neutral-900">
      <SlipHeader
        slip={slip}
        copyKind={copyKind}
        issueDate={issueDate}
        issueCount={issueCount}
        pageNo={pageNo}
        pageCount={pageCount}
      />

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <SlipItemsTable lines={lines} showPrices={showPrices} />
          {isLastPage ? (
            <div className="mt-1 flex justify-end gap-6 text-sm">
              <span>
                合計重量 <span className="font-bold tabular-nums">{totals.totalWeight.toLocaleString('ja-JP', { minimumFractionDigits: 2 })}</span> kg
              </span>
              {showPrices && (
                <>
                  <span>
                    合計金額 <span className="font-bold tabular-nums">{totals.totalAmount.toLocaleString('ja-JP')}</span> 円
                  </span>
                  {/* 単価が決まっていない行があれば、合計に含まれていないことを添える */}
                  {totals.unpricedCount > 0 && <span>単価未定 {totals.unpricedCount} 行（合計に含まない）</span>}
                </>
              )}
            </div>
          ) : (
            <p className="mt-1 text-right text-sm font-semibold">次のページに続きます</p>
          )}
        </div>

        <div className="flex w-[74mm] shrink-0 flex-col">
          <SlipInstructions shot={slip.shot} lineMarks={lineMarks} stamps={slip.stamps} fieldNote={slip.fieldNote} />
        </div>
      </div>
    </section>
  )
}
