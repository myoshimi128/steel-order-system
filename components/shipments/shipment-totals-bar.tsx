// 送り状の今回の合計（入力の画面と確認の画面の表の下）。
//   今回の数量・角重量の合計（請求の根拠）・実重量の合計（配送の依頼に使う重量）
// 実重量がわからず角重量で代わりに数えた行があれば、その行数を添える（配送の重量が実際より重く出るため）。

import { quantityText, weightText } from '@/lib/shipments/shipment-format'
import type { ShipmentTotals } from '@/lib/shipments/shipment-lines'

export function ShipmentTotalsBar({ totals }: { totals: ShipmentTotals }) {
  return (
    <div className="flex items-center justify-end gap-8 border-t border-line px-4 py-3 text-sm">
      {totals.estimatedCount > 0 && (
        <span className="text-xs font-semibold text-attention">
          実重量が未入力の {totals.estimatedCount} 行は、角重量で数えています
        </span>
      )}
      <span className="text-neutral-600">
        今回の数量 <span className="font-bold tabular-nums text-neutral-900">{quantityText(totals.quantity)}</span> 枚
      </span>
      <span className="text-neutral-600">
        角重量の合計 <span className="font-bold tabular-nums text-neutral-900">{weightText(totals.squareWeight)}</span> kg
      </span>
      <span className="text-neutral-600">
        実重量の合計（配送）
        <span className="ml-1 text-lg font-bold tabular-nums text-navy">{weightText(totals.deliveryWeight)}</span> kg
      </span>
    </div>
  )
}
