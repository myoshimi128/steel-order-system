// 積み込み用・運転手用の右の欄（配送の欄）。配達と、実重量の合計を大きく出す（積み込み・運送の目安）。
// 実重量が未入力の行があれば、角重量で代わりに数えた行数を添える（合計が実際より重く出るため）。

import { weightText } from '@/lib/shipments/shipment-format'

type ShipmentDeliveryBoxProps = {
  delivery: string
  // 最後のページだけ合計を出す（途中のページは null）
  totalWeight: number | null
  estimatedCount: number
}

export function ShipmentDeliveryBox({ delivery, totalWeight, estimatedCount }: ShipmentDeliveryBoxProps) {
  return (
    <div className="flex flex-1 flex-col border-2 border-neutral-900">
      <div className="border-b border-neutral-900 bg-neutral-100 px-2 py-1 text-center text-sm font-bold tracking-widest">配送</div>
      <div className="flex flex-col gap-4 px-3 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-700">配達</span>
          <span className="text-2xl font-black">{delivery || '―'}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-neutral-700">実重量の合計</span>
          {totalWeight === null ? (
            <span className="text-sm font-semibold">最後のページに出します</span>
          ) : (
            <span className="text-2xl font-black tabular-nums">{weightText(totalWeight)} kg</span>
          )}
          {totalWeight !== null && estimatedCount > 0 && (
            <span className="mt-1 text-xs">（「角」の {estimatedCount} 行は実重量が未入力のため角重量で数えています）</span>
          )}
        </div>
      </div>
    </div>
  )
}
