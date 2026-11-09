'use client'

// 送り状の入力の明細の表と、その下の合計（今回の数量・角重量・配送の依頼に使う実重量）。
// 事務所の画面なので、角重量（請求の根拠）と実重量（配送の依頼）の両方を出す。
// 行の中身は ShipmentItemRow。

import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import type { ShipmentEntry } from '@/lib/shipments/use-shipment-entry'
import { ShipmentItemRow } from './shipment-item-row'
import { ShipmentTotalsBar } from './shipment-totals-bar'

type ShipmentItemsTableProps = {
  entry: ShipmentEntry
  navigation: FieldNavigation
}

export function ShipmentItemsTable({ entry, navigation }: ShipmentItemsTableProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded border border-line bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-canvas text-xs text-neutral-500">
            <tr>
              <th className="w-10 px-2 py-2 text-center font-semibold">No.</th>
              <th className="w-24 px-2 py-2 text-left font-semibold">切断方法</th>
              <th className="px-2 py-2 text-left font-semibold">品名と寸法</th>
              <th className="w-20 px-2 py-2 text-right font-semibold">受注数量</th>
              <th className="w-20 px-2 py-2 text-right font-semibold">出荷済み</th>
              <th className="w-16 px-2 py-2 text-right font-semibold">残り</th>
              <th className="w-24 px-2 py-2 text-right font-semibold">今回の数量</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">実重量 1 枚（kg）</th>
              <th className="w-28 px-2 py-2 text-right font-semibold">角重量（kg）</th>
              <th className="w-32 px-2 py-2 text-right font-semibold">実重量（kg）</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map(({ item, weights }) => (
              <ShipmentItemRow
                key={item.id}
                item={item}
                value={entry.values[item.id]}
                weights={weights}
                error={entry.itemErrors[item.id]}
                navigation={navigation}
                onQuantityChange={(text) => entry.setQuantity(item.id, text)}
                onPieceWeightChange={(text) => entry.setPieceWeight(item.id, text)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <ShipmentTotalsBar totals={entry.totals} />
    </section>
  )
}
