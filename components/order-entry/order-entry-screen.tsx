'use client'

// 受注登録画面の全体。ヘッダー・明細・キー操作の案内・登録ボタンを並べる。
// 補助エリア（注意事項・スタンプ・フリーコメント）は次の作業で追加する。
//
//   入力値: useOrderHeader（ヘッダー）・useOrderItems（明細）
//   計算  : useItemCalculations（重量・仕入単価・合計）
//   欄の移動: useFieldNavigation（ヘッダー → 明細の各行 → 登録ボタン の順）
// ここでは保存の流れ（確認 → Server Action の呼び出し → 結果の表示）だけを扱う。

import { useEffect, useState, useTransition, type KeyboardEvent } from 'react'
import { createOrder } from '@/app/orders/new/actions'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { itemFieldId, itemFieldOrder } from '@/lib/order-entry/item-row'
import type { ItemFieldName } from '@/lib/order-entry/item-types'
import type { OrderEntryMasters } from '@/lib/order-entry/load-order-entry-masters'
import { useItemCalculations } from '@/lib/order-entry/use-item-calculations'
import { useOrderHeader } from '@/lib/order-entry/use-order-header'
import { useOrderItems } from '@/lib/order-entry/use-order-items'
import { hasErrors } from '@/lib/order-entry/validate-order-header'
import { hasItemErrors } from '@/lib/order-entry/validate-order-items'
import { OrderHeader } from './header/order-header'
import { KeyGuide } from './items/key-guide'
import { OrderItemsTable } from './items/order-items-table'

type OrderEntryScreenProps = {
  masters: OrderEntryMasters
  // 日本時間の今日の日付 'YYYY-MM-DD'（サーバーで求めて渡す）
  today: string
}

type StatusMessage = { kind: 'success' | 'error' | 'info'; text: string }

export function OrderEntryScreen({ masters, today }: OrderEntryScreenProps) {
  const header = useOrderHeader(masters.header, today)
  // スプライス専用の受注かどうかとショットの有無（ヘッダーの値）で、明細の区分の解釈と単価が変わる。
  // スプライスの 0 / 1 を切り替えても明細は残し、切り替え後の受注で使えない区分の行にはエラーを出す
  const context = { isSplice: header.isSplice, spliceShot: header.spliceShot }
  const items = useOrderItems(masters.items, context)
  // 単価の基準日は受注日（料金改定があっても受注日時点の単価を使う）
  const { rows: calculations, totals } = useItemCalculations(
    items.rows,
    items.checks,
    header.values.orderDate,
  )

  // 画面全体の入力順: ヘッダーの欄 → 明細の各行の欄 → 登録ボタン
  const fieldOrder = [
    ...header.fieldOrder.filter((id) => id !== 'submit'),
    ...items.rows.flatMap((row, index) => {
      const check = items.checks[index]
      // 加工の行は入力順が決まっているため、材料の行の判定（材質・製鋼法の有無）は使わない
      const flags =
        check.kind === 'material'
          ? check.resolved
          : { needsMaterial: false, steelMakingApplicable: false }
      return itemFieldOrder(row, flags, masters.items, context)
    }),
    'submit',
  ]
  const navigation = useFieldNavigation(fieldOrder)

  // 画面を開いたら、入力順の最初の欄（処理区分）にカーソルを置く。
  // 登録後に画面が空に戻ったときも、handleSubmit の中で同じく最初の欄へ移る
  const { focusFirst } = navigation
  useEffect(() => {
    focusFirst()
  }, [focusFirst])

  const [isPending, startTransition] = useTransition()
  // 画面下部に出すメッセージ（保存の結果・キー操作の案内など）
  const [status, setStatus] = useState<StatusMessage | null>(null)

  // エラーのある最初の欄へ移る（ヘッダー → 明細の順に探す）
  function focusFirstError(
    headerErrorIds: string[],
    itemErrors: Record<string, Partial<Record<ItemFieldName, string>>>,
  ) {
    const errorIds = new Set(headerErrorIds)
    for (const [rowKey, errors] of Object.entries(itemErrors)) {
      for (const field of Object.keys(errors) as ItemFieldName[]) {
        errorIds.add(itemFieldId(rowKey, field))
      }
    }
    const first = fieldOrder.find((id) => errorIds.has(id))
    if (first) {
      navigation.focusField(first)
    }
  }

  function handleSubmit() {
    setStatus(null)

    // 画面側で先に確認する（サーバーでも同じ確認をする）
    const headerErrors = header.validate()
    const itemsValidation = items.validate()
    if (hasErrors(headerErrors) || hasItemErrors(itemsValidation)) {
      focusFirstError(Object.keys(headerErrors), itemsValidation.rowErrors)
      setStatus({ kind: 'error', text: itemsValidation.itemsError ?? '入力内容を確認してください' })
      return
    }

    // Server Action を呼んで、ヘッダーと明細をまとめて保存する。
    // startTransition の中で呼ぶと、保存中（isPending）の状態を使ってボタンを押せなくできる
    const headerInput = header.toInput()
    const itemRows = items.rows
    startTransition(async () => {
      const response = await createOrder(headerInput, itemRows)
      if (response.ok) {
        setStatus({ kind: 'success', text: `受注No. ${response.orderNo} を登録しました` })
        // 次の受注を続けて入力できるよう、初期値に戻して最初の欄へ移る
        header.reset()
        items.reset()
        navigation.focusFirst()
        return
      }
      if (response.headerErrors) {
        header.setErrors(response.headerErrors)
      }
      items.setServerErrors(response.itemErrors, response.itemsError)
      setStatus({ kind: 'error', text: response.message ?? '入力内容を確認してください' })
    })
  }

  // 登録ボタンでも Shift+Enter で前の欄へ戻れるようにする（Enter はボタンの既定動作で押される）
  function handleSubmitKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault()
      navigation.focusPrevious('submit')
    }
  }

  return (
    // 画面の高さ（上部のユーザー表示の分を除く）に収め、明細の部分だけをスクロールさせる。
    // ↑↓ による欄の移動は、ここ（画面全体の外枠）でまとめて受け取る
    <div
      onKeyDown={navigation.handleArrowKeys}
      className="flex h-[calc(100dvh-41px)] min-h-0 flex-col"
    >
      {/* ヘッダーは固定表示（明細が増えても見失わないようにする） */}
      <div className="shrink-0">
        <OrderHeader
          header={header}
          navigation={navigation}
          masters={masters.header}
          today={today}
        />
      </div>

      <OrderItemsTable
        items={items}
        calculations={calculations}
        totals={totals}
        masters={masters.items}
        isSplice={header.isSplice}
        navigation={navigation}
        onNotice={(text) => setStatus({ kind: 'info', text })}
      />

      <KeyGuide />

      <footer className="flex shrink-0 items-center justify-end gap-4 border-t border-neutral-200 px-6 py-3 dark:border-neutral-800">
        {status && (
          <p
            role="status"
            className={`text-sm ${
              status.kind === 'success'
                ? 'text-green-700 dark:text-green-400'
                : status.kind === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-neutral-600 dark:text-neutral-400'
            }`}
          >
            {status.text}
          </p>
        )}
        <button
          ref={navigation.register('submit')}
          type="button"
          onClick={handleSubmit}
          onKeyDown={handleSubmitKeyDown}
          disabled={isPending}
          className="rounded bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? '登録中…' : '登録'}
        </button>
      </footer>
    </div>
  )
}
