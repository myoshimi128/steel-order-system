'use client'

// 送り状発行の入口の上の、番号で呼び出す欄（受注No. で送り状を作る / 送り状No. で発行済みの送り状を開く）。
// どちらも文字の欄（TextField）なので、「-」はハイフンとしてそのまま入る。Enter で呼び出す。
// 状態と操作は useShipmentLookup。

import { useEffect } from 'react'
import { TextField } from '@/components/code-input/text-field'
import { FormItem } from '@/components/order-entry/header/form-item'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { useShipmentLookup } from '@/lib/shipments/use-shipment-lookup'

// 欄の文字数の上限（受注No. は 26-10000-99、送り状No. はその後ろに -999 まで入る長さ）
const ORDER_NO_MAX_LENGTH = 14
const SHIPMENT_NO_MAX_LENGTH = 18

export function ShipmentLookupForm() {
  const lookup = useShipmentLookup()
  const navigation = useFieldNavigation(['orderNo', 'shipmentNo'])

  // 開いたら、受注No. の欄にカーソルを置く（送り状を作るのがいちばん多い操作のため）
  const { focusField } = navigation
  useEffect(() => {
    focusField('orderNo')
  }, [focusField])

  return (
    <section className="flex items-start gap-10 rounded border border-line bg-white px-6 py-4" onKeyDown={navigation.handleArrowKeys}>
      <FormItem label="受注No. で送り状を作る" htmlFor="orderNo" note="例: 26-1003-1">
        <div className="flex items-start gap-2">
          <TextField
            {...navigation.fieldProps('orderNo')}
            value={lookup.orderNo}
            onValueChange={lookup.setOrderNo}
            onNext={lookup.openOrder}
            error={lookup.orderNoError ?? undefined}
            maxLength={ORDER_NO_MAX_LENGTH}
            widthClass="w-48"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={lookup.openOrder}
            className="rounded bg-navy px-4 py-1.5 text-sm font-semibold text-white hover:bg-navy-hover"
          >
            送り状を作る
          </button>
        </div>
      </FormItem>

      <FormItem label="送り状No. で呼び出す（印刷し直し・取り消し）" htmlFor="shipmentNo" note="例: 26-1003-1-01">
        <div className="flex items-start gap-2">
          <TextField
            {...navigation.fieldProps('shipmentNo')}
            value={lookup.shipmentNo}
            onValueChange={lookup.setShipmentNo}
            onNext={lookup.openShipment}
            error={lookup.shipmentNoError ?? undefined}
            maxLength={SHIPMENT_NO_MAX_LENGTH}
            widthClass="w-52"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={lookup.openShipment}
            className="rounded border border-navy bg-white px-4 py-1.5 text-sm font-semibold text-navy hover:bg-navy-soft"
          >
            呼び出す
          </button>
        </div>
      </FormItem>
    </section>
  )
}
