'use client'

// 送り状の入力の明細 1 行（材料の行。加工の行は品名の下に小さく出すだけで、単独では出荷しない）。
//
//   列: No.・切断方法・品名と寸法・受注数量・出荷済み・残り・今回の数量（入力）・実重量 1 枚・角重量（今回）・実重量（今回）
//   今回の数量: テンキーで打ち、Enter で次の欄へ（受注登録の明細と同じ）。残りが 0 の行は「出荷済み」と出し、欄を出さない
//   実重量 1 枚: 受注の明細に実重量がある行は計算した値を出すだけ。ない行（アイトレ・ササラ）だけ入力の欄を出す（任意）
//   実重量（今回）: 入力しなかった行は角重量で代わりに数え、「角」の印を付ける（配送の依頼に使う重量）

import { NumericField } from '@/components/code-input/numeric-field'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { quantityFieldId, weightFieldId } from '@/lib/shipments/field-ids'
import { quantityText, weightText } from '@/lib/shipments/shipment-format'
import {
  deliveryWeight,
  needsActualWeightInput,
  remainingQuantity,
  type ShipmentEntryValues,
  type ShipmentLineWeights,
} from '@/lib/shipments/shipment-lines'
import type { ShipmentOrderItem } from '@/lib/shipments/types'

type ShipmentItemRowProps = {
  item: ShipmentOrderItem
  value: ShipmentEntryValues
  weights: ShipmentLineWeights
  error: string | undefined
  navigation: FieldNavigation
  onQuantityChange: (text: string) => void
  onPieceWeightChange: (text: string) => void
}

const CELL = 'px-2 py-1.5 align-top'

export function ShipmentItemRow({
  item,
  value,
  weights,
  error,
  navigation,
  onQuantityChange,
  onPieceWeightChange,
}: ShipmentItemRowProps) {
  const remaining = remainingQuantity(item)
  const done = remaining === 0
  const delivery = deliveryWeight(weights)

  return (
    <>
      <tr className={`border-t border-line ${done ? 'bg-canvas text-neutral-400' : ''}`}>
        <td className={`${CELL} text-center tabular-nums`}>{item.lineNo}</td>
        <td className={`${CELL} truncate`}>{item.cuttingMethod}</td>
        <td className={CELL}>
          <div className="truncate font-semibold">{item.productName}</div>
          {item.processes.map((text, index) => (
            <div key={index} className="truncate pl-3 text-xs text-neutral-500">
              └ {text}
            </div>
          ))}
        </td>
        <td className={`${CELL} text-right tabular-nums`}>{quantityText(item.orderedQuantity)}</td>
        <td className={`${CELL} text-right tabular-nums`}>{quantityText(item.shippedQuantity)}</td>
        <td className={`${CELL} text-right font-semibold tabular-nums`}>{quantityText(remaining)}</td>
        <td className={CELL}>
          {done ? (
            <span className="block text-right text-xs">出荷済み</span>
          ) : (
            <NumericField
              {...navigation.fieldProps(quantityFieldId(item.id))}
              value={value.quantity}
              onValueChange={onQuantityChange}
              error={error}
              showErrorText={false}
              widthClass="w-20"
              dense
            />
          )}
        </td>
        <td className={CELL}>
          {needsActualWeightInput(item) ? (
            !done && (
              <NumericField
                {...navigation.fieldProps(weightFieldId(item.id))}
                value={value.pieceWeight}
                onValueChange={onPieceWeightChange}
                allowDecimal
                placeholder="任意"
                showErrorText={false}
                widthClass="w-24"
                dense
              />
            )
          ) : (
            <span className="block text-right tabular-nums text-neutral-600">{weightText(item.actualPieceWeight)}</span>
          )}
        </td>
        <td className={`${CELL} text-right tabular-nums`}>{weightText(weights.square)}</td>
        <td className={`${CELL} text-right tabular-nums`}>
          {delivery.estimated && (
            // 実重量がわからず、角重量で代わりに数えた印
            <span className="mr-1 rounded border border-attention px-1 text-[10px] font-bold text-attention" title="実重量が未入力のため角重量で数えています">
              角
            </span>
          )}
          {weightText(delivery.weight)}
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={10} className="px-2 pb-1.5 text-right text-xs text-urgent">
            行 {item.lineNo}: {error}
          </td>
        </tr>
      )}
    </>
  )
}
