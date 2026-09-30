'use client'

// 受注登録画面の全体。ヘッダー・明細・補助エリア・登録ボタンを並べる。
// 現時点ではヘッダーのみ実装しており、明細と補助エリアは次の作業で追加する。
//
// 入力値は useOrderHeader、欄の移動は useFieldNavigation が管理する。
// ここでは保存の流れ（確認 → Server Action の呼び出し → 結果の表示）だけを扱う。

import { useState, useTransition, type KeyboardEvent } from 'react'
import { createOrderHeader } from '@/app/orders/new/actions'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { hasErrors } from '@/lib/order-entry/validate-order-header'
import {
  useOrderHeader,
  type HeaderMasterOptions,
} from '@/lib/order-entry/use-order-header'
import { OrderHeader } from './header/order-header'

type OrderEntryScreenProps = {
  masters: HeaderMasterOptions
  // 日本時間の今日の日付 'YYYY-MM-DD'（サーバーで求めて渡す）
  today: string
}

export function OrderEntryScreen({ masters, today }: OrderEntryScreenProps) {
  const header = useOrderHeader(masters, today)
  const navigation = useFieldNavigation(header.fieldOrder)
  const [isPending, startTransition] = useTransition()
  // 保存の結果のメッセージ（成功・失敗）
  const [result, setResult] = useState<{ kind: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleSubmit() {
    setResult(null)

    // 画面側で先に確認し、エラーがあれば最初の欄へ移る
    const errors = header.validate()
    if (hasErrors(errors)) {
      const firstErrorField = header.fieldOrder.find((id) => id in errors)
      if (firstErrorField) {
        navigation.focusField(firstErrorField)
      }
      setResult({ kind: 'error', text: '入力内容を確認してください' })
      return
    }

    // Server Action を呼んで保存する。startTransition の中で呼ぶと、
    // 保存中（isPending）の状態を使ってボタンを押せなくできる
    const input = header.toInput()
    startTransition(async () => {
      const response = await createOrderHeader(input)
      if (response.ok) {
        setResult({ kind: 'success', text: `受注No. ${response.orderNo} を登録しました` })
        // 次の受注を続けて入力できるよう、初期値に戻して最初の欄へ移る
        header.reset()
        navigation.focusFirst()
        return
      }
      if (response.errors) {
        header.setErrors(response.errors)
      }
      setResult({ kind: 'error', text: response.message ?? '入力内容を確認してください' })
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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ヘッダーは固定表示（明細が増えても見失わないようにする） */}
      <div className="sticky top-0 z-10">
        <OrderHeader header={header} navigation={navigation} masters={masters} today={today} />
      </div>

      {/* 明細（次の作業で実装） */}
      <div className="flex-1 px-6 py-8 text-sm text-neutral-400">明細は次の作業で実装します</div>

      <footer className="flex items-center justify-end gap-4 border-t border-neutral-200 px-6 py-4 dark:border-neutral-800">
        {result && (
          <p
            role="status"
            className={`text-sm ${
              result.kind === 'success'
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {result.text}
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
