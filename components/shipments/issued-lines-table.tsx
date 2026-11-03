// 発行済みの送り状の明細の表（確認の画面。読むだけ）。
//   列: No.・切断方法・品名と寸法（加工の文を下に）・今回の数量・角重量・実重量
// 実重量が未入力（アイトレ・ササラで入れなかった行）は、角重量で代わりに数えた印「角」を付ける。

import { quantityText, weightText } from '@/lib/shipments/shipment-format'
import { deliveryWeight, issuedLineWeights } from '@/lib/shipments/shipment-lines'
import type { IssuedShipmentLine } from '@/lib/shipments/types'

const CELL = 'px-2 py-1.5 align-top'

export function IssuedLinesTable({ lines }: { lines: readonly IssuedShipmentLine[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <table className="w-full table-fixed text-sm">
        <thead className="sticky top-0 bg-canvas text-xs text-neutral-500">
          <tr>
            <th className="w-10 px-2 py-2 text-center font-semibold">No.</th>
            <th className="w-24 px-2 py-2 text-left font-semibold">切断方法</th>
            <th className="px-2 py-2 text-left font-semibold">品名と寸法</th>
            <th className="w-24 px-2 py-2 text-right font-semibold">今回の数量</th>
            <th className="w-28 px-2 py-2 text-right font-semibold">角重量（kg）</th>
            <th className="w-32 px-2 py-2 text-right font-semibold">実重量（kg）</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => {
            const delivery = deliveryWeight(issuedLineWeights(line))
            return (
              <tr key={line.lineNo} className="border-t border-line">
                <td className={`${CELL} text-center tabular-nums`}>{line.lineNo}</td>
                <td className={`${CELL} truncate`}>{line.cuttingMethod}</td>
                <td className={CELL}>
                  <div className="truncate font-semibold">{line.productName}</div>
                  {line.processes.map((text, index) => (
                    <div key={index} className="truncate pl-3 text-xs text-neutral-500">
                      └ {text}
                    </div>
                  ))}
                </td>
                <td className={`${CELL} text-right font-semibold tabular-nums`}>{quantityText(line.quantity)}</td>
                <td className={`${CELL} text-right tabular-nums`}>{weightText(line.squareWeight)}</td>
                <td className={`${CELL} text-right tabular-nums`}>
                  {delivery.estimated && (
                    <span className="mr-1 rounded border border-attention px-1 text-[10px] font-bold text-attention" title="実重量が未入力のため角重量で数えています">
                      角
                    </span>
                  )}
                  {weightText(delivery.weight)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
