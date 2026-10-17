'use client'

// 受注登録画面の全体（docs/screen-design.md「受注登録画面」）。
// ① 受注情報 → ② 注文内容 → ③ 伝票の指示 の 3 つの画面を、このページの中で切り替える。
// 画面を移っても入力した内容は消えない（入力値は 3 つの画面で共通のフックが持つ）。
//
//   入力値  : useOrderHeader（受注情報）・useOrderItems（明細）・useOrderAux（スタンプ・フリーコメント）
//   計算    : useItemCalculations（重量。仕入単価も裏で計算するが画面には出さない）
//   注意事項: notices.ts（得意先と明細の内容から、受注に関係するものだけに絞り込む。表示のみ）
//   欄の移動: useFieldNavigation（今の画面の欄だけを入力順に並べる）
//   注文書  : useDocumentPanel（左のパネルの幅と開閉。F2 で開閉）
// ここでは画面の切り替えと保存の流れ（確認 → Server Action の呼び出し → 結果の表示）だけを扱う。

import { useEffect, useState, useTransition, type KeyboardEvent } from 'react'
import { createOrder } from '@/app/(main)/orders/new/actions'
import { findCodeOption } from '@/lib/code-input/code-option'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { DUE_DATE_TYPE_OPTIONS, MEMBER_CLASS_OPTIONS } from '@/lib/order-entry/constants'
import { fieldNoteRows } from '@/lib/order-entry/field-note-rows'
import { firstItemFieldId, itemFieldId, itemFieldOrder } from '@/lib/order-entry/item-row'
import type { ItemFieldName } from '@/lib/order-entry/item-types'
import type { OrderEntryMasters } from '@/lib/order-entry/load-order-entry-masters'
import { customerNoticesFor, orderNoticeConditions } from '@/lib/order-entry/notices'
import {
  SUBMIT_BUTTON_ID,
  TO_INSTRUCTIONS_BUTTON_ID,
  TO_ITEMS_BUTTON_ID,
  type OrderEntryStep,
} from '@/lib/order-entry/order-entry-steps'
import { useDocumentPanel } from '@/lib/order-entry/use-document-panel'
import { useItemCalculations } from '@/lib/order-entry/use-item-calculations'
import { FREE_COMMENT_FIELD_ID, STAMP_CODE_FIELD_ID, useOrderAux } from '@/lib/order-entry/use-order-aux'
import { useOrderHeader } from '@/lib/order-entry/use-order-header'
import { useOrderItems } from '@/lib/order-entry/use-order-items'
import { hasErrors } from '@/lib/order-entry/validate-order-header'
import { hasItemErrors } from '@/lib/order-entry/validate-order-items'
import { DocumentPanel } from './document-panel/document-panel'
import { OrderHeader } from './header/order-header'
import { KeyGuide } from './items/key-guide'
import { OrderItemsTable } from './items/order-items-table'
import { OrderSummary } from './order-summary'
import { StepIndicator } from './step-indicator'
import { AuxArea } from './support-area/aux-area'
import { CustomerNoticeStrip } from './support-area/customer-notice-strip'
import { FieldNoteList } from './support-area/field-note-list'

type OrderEntryScreenProps = {
  masters: OrderEntryMasters
  // 日本時間の今日の日付 'YYYY-MM-DD'（サーバーで求めて渡す）
  today: string
  // 注文書のパネルの保存されている幅と開閉（サーバーが cookie から読む）
  initialPanelWidth: number | null
  initialPanelOpen: boolean
}

type StatusMessage = { kind: 'success' | 'error' | 'info'; text: string }

// 'YYYY-MM-DD' を要約に出す「MM/DD」にする
function shortDate(value: string): string {
  return value ? value.slice(5).replace('-', '/') : ''
}

export function OrderEntryScreen({ masters, today, initialPanelWidth, initialPanelOpen }: OrderEntryScreenProps) {
  const [step, setStep] = useState<OrderEntryStep>('info')

  const header = useOrderHeader(masters.header, today)
  // スプライス専用の受注か（部材区分が SPL）とショットの有無で、明細の番号の解釈と単価が変わる。
  // 部材区分を切り替えても明細は残し、切り替え後の受注で使えない番号の行にはエラーを出す
  const context = { isSplice: header.isSplice, spliceShot: header.spliceShot }
  const items = useOrderItems(masters.items, context)
  // 単価の基準日は受注日（料金改定があっても受注日時点の単価を使う）
  const { rows: calculations, totals } = useItemCalculations(items.rows, items.checks, header.values.orderDate)

  // スタンプ・フリーコメント。得意先を選ぶと、その得意先の指定スタンプにチェックが入る
  const aux = useOrderAux(masters.aux, header.customerId)
  // 得意先の注意事項。得意先・切断方法・加工種別の条件がすべて受注に当てはまるものだけ
  const notices = customerNoticesFor(
    masters.aux.customerNotices,
    orderNoticeConditions(header.customerId, items.checks),
    masters.items.processTypes,
  )
  // スプライス専用の受注でショットが有なら「ショット加工」を自動で出す（保存はしない）
  const showShotStamp = header.isSplice && header.spliceShot === true

  // 注文書のパネルと右の中身を並べる枠の要素（幅を測るため。ref に setter を渡して受け取る）
  const [panelContainer, setPanelContainer] = useState<HTMLDivElement | null>(null)
  const panel = useDocumentPanel(panelContainer, initialPanelWidth, initialPanelOpen)

  // ③ 伝票の指示の摘要の一覧（何も入力していない行は除く）
  const noteRows = fieldNoteRows(items.rows, items.checks, masters.items, context)

  // 画面ごとの入力順。今の画面の欄だけを並べ、最後は画面を進めるボタン
  const infoOrder = [...header.fieldOrder.filter((id) => id !== 'submit'), TO_ITEMS_BUTTON_ID]
  const itemsOrder = [
    ...items.rows.flatMap((row, index) => {
      const check = items.checks[index]
      // 加工の行は入力順が決まっているため、材料の行の判定（材質・製鋼法の有無）は使わない
      const flags =
        check.kind === 'material' ? check.resolved : { needsMaterial: false, steelMakingApplicable: false }
      return itemFieldOrder(row, flags, masters.items, context)
    }),
    TO_INSTRUCTIONS_BUTTON_ID,
  ]
  const instructionsOrder = [
    ...noteRows.map((row) => itemFieldId(row.key, 'fieldNote')),
    STAMP_CODE_FIELD_ID,
    FREE_COMMENT_FIELD_ID,
    SUBMIT_BUTTON_ID,
  ]
  const fieldOrder = step === 'info' ? infoOrder : step === 'items' ? itemsOrder : instructionsOrder
  const navigation = useFieldNavigation(fieldOrder)

  // 画面を開いたら、最初の欄（処理区分）にカーソルを置く
  const { focusFirst } = navigation
  useEffect(() => {
    focusFirst()
  }, [focusFirst])

  const [isPending, startTransition] = useTransition()
  // 画面下部に出すメッセージ（保存の結果・キー操作の案内など）
  const [status, setStatus] = useState<StatusMessage | null>(null)

  // 画面を切り替えて、指定した欄へ移る（欄は切り替えた後の画面に出るため、画面の更新後に移る）
  function goTo(next: OrderEntryStep, focusId: string) {
    setStep(next)
    navigation.focusFieldLater(focusId)
  }

  // ① → ②。受注情報を確認し、エラーがあれば ① に留まる（必須は売り先など）
  function goToItems() {
    const headerErrors = header.validate()
    if (hasErrors(headerErrors)) {
      const first = infoOrder.find((id) => id in headerErrors)
      if (first) {
        navigation.focusField(first)
      }
      setStatus({ kind: 'error', text: '受注情報を確認してください' })
      return
    }
    setStatus(null)
    goTo('items', firstItemFieldId(items.rows[0]))
  }

  // ② → ③。最初の摘要の欄（明細がなければスタンプの番号）へ移る
  function goToInstructions() {
    setStatus(null)
    goTo('instructions', noteRows.length > 0 ? itemFieldId(noteRows[0].key, 'fieldNote') : STAMP_CODE_FIELD_ID)
  }

  // 明細のエラーのある最初の欄の ID（② の入力順で探す）
  function firstItemErrorId(itemErrors: Record<string, Partial<Record<ItemFieldName, string>>>) {
    const errorIds = new Set<string>()
    for (const [rowKey, errors] of Object.entries(itemErrors)) {
      for (const field of Object.keys(errors) as ItemFieldName[]) {
        errorIds.add(itemFieldId(rowKey, field))
      }
    }
    return itemsOrder.find((id) => errorIds.has(id)) ?? firstItemFieldId(items.rows[0])
  }

  // 登録。①〜③ の入力をまとめて確認し、エラーがあればその画面に戻ってエラーの欄にカーソルを置く
  function handleSubmit() {
    setStatus(null)

    const headerErrors = header.validate()
    const itemsValidation = items.validate()
    if (hasErrors(headerErrors)) {
      goTo('info', infoOrder.find((id) => id in headerErrors) ?? infoOrder[0])
      setStatus({ kind: 'error', text: '受注情報を確認してください' })
      return
    }
    if (hasItemErrors(itemsValidation)) {
      goTo('items', firstItemErrorId(itemsValidation.rowErrors))
      setStatus({ kind: 'error', text: itemsValidation.itemsError ?? '注文内容を確認してください' })
      return
    }

    // Server Action を呼んで、受注情報・明細・スタンプなどをまとめて保存する。
    // startTransition の中で呼ぶと、保存中（isPending）の状態を使ってボタンを押せなくできる
    const headerInput = header.toInput()
    const itemRows = items.rows
    const auxInput = aux.toInput()
    startTransition(async () => {
      const response = await createOrder(headerInput, itemRows, auxInput)
      if (response.ok) {
        setStatus({ kind: 'success', text: `受注No. ${response.orderNo} を登録しました` })
        // 次の受注を続けて入力できるよう、初期値に戻して ① の最初の欄へ移る
        header.reset()
        items.reset()
        aux.reset()
        goTo('info', 'processingType')
        return
      }
      if (response.headerErrors && hasErrors(response.headerErrors)) {
        header.setErrors(response.headerErrors)
        goTo('info', infoOrder.find((id) => id in (response.headerErrors ?? {})) ?? infoOrder[0])
      } else if (response.itemErrors && Object.keys(response.itemErrors).length > 0) {
        items.setServerErrors(response.itemErrors, response.itemsError)
        goTo('items', firstItemErrorId(response.itemErrors))
      } else {
        items.setServerErrors(response.itemErrors, response.itemsError)
      }
      setStatus({ kind: 'error', text: response.message ?? '入力内容を確認してください' })
    })
  }

  // 画面を進めるボタンでも Shift+Enter で前の欄へ戻れるようにする（Enter はボタンの既定動作で押される）
  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault()
      navigation.focusPrevious(id)
    }
  }

  // ②・③ の上部に出す受注情報の要約
  const summary = [
    { label: '受注No.', value: '（登録時に採番）' },
    { label: '部材', value: findCodeOption(MEMBER_CLASS_OPTIONS, header.values.memberClass)?.label ?? '' },
    { label: '売り先', value: findCodeOption(masters.header.customers, header.values.customerId)?.label ?? '' },
    {
      label: '納期',
      value: [
        findCodeOption(DUE_DATE_TYPE_OPTIONS, header.values.dueDateType)?.label ?? '',
        header.needsDueDate ? shortDate(header.values.dueDate) : '',
      ]
        .filter(Boolean)
        .join(' '),
    },
    {
      label: '入れ先',
      value: findCodeOption(masters.header.destinations, header.values.deliveryDestinationId)?.label ?? '',
    },
  ]
  const backToInfo = () => goTo('info', 'processingType')

  const primaryButton =
    'rounded bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-50'
  const secondaryButton =
    'rounded border border-line bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-navy-soft'

  return (
    // 画面の高さ（共通レイアウトのヘッダーの分を除く）に収め、明細などの部分だけをスクロールさせる。
    // ↑↓ による欄の移動は、ここ（画面全体の外枠）でまとめて受け取る
    <div
      onKeyDown={navigation.handleArrowKeys}
      className="flex h-[calc(100dvh-var(--header-height))] min-h-0 flex-col gap-3 bg-canvas px-6 py-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-navy">受注登録</h1>
        <StepIndicator current={step} />
      </div>

      {/* 左に注文書のパネル、右に画面ごとの中身。パネルの最大の幅は、この枠の幅から決まる */}
      <div ref={setPanelContainer} className="flex min-h-0 flex-1 gap-4">
        <DocumentPanel panel={panel} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded border border-line bg-white">
          {step === 'info' && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <OrderHeader header={header} navigation={navigation} masters={masters.header} today={today} />
            </div>
          )}

          {step === 'items' && (
            <>
              <OrderSummary items={summary} onBackToInfo={backToInfo} />
              <CustomerNoticeStrip notices={notices} />
              <OrderItemsTable
                items={items}
                calculations={calculations}
                totalWeight={totals.totalWeight}
                masters={masters.items}
                processNotices={masters.aux.processNotices}
                context={context}
                finishFieldId={TO_INSTRUCTIONS_BUTTON_ID}
                navigation={navigation}
                onNotice={(text) => setStatus({ kind: 'info', text })}
              />
            </>
          )}

          {step === 'instructions' && (
            <>
              <OrderSummary items={summary} onBackToInfo={backToInfo} />
              <FieldNoteList rows={noteRows} items={items} navigation={navigation} />
              <AuxArea
                aux={aux}
                notices={notices}
                hasCustomer={header.customerId !== null}
                showShotStamp={showShotStamp}
                navigation={navigation}
              />
            </>
          )}
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-4">
        <KeyGuide step={step} />
        <div className="ml-auto flex shrink-0 items-center gap-3">
          {status && (
            <p
              role="status"
              className={`text-sm ${
                status.kind === 'success'
                  ? 'text-green-700'
                  : status.kind === 'error'
                    ? 'text-urgent'
                    : 'text-neutral-600'
              }`}
            >
              {status.text}
            </p>
          )}

          {step === 'info' && (
            <>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
                  header.reset()
                  setStatus(null)
                  navigation.focusFirst()
                }}
                className={secondaryButton}
              >
                クリア
              </button>
              <button
                ref={navigation.register(TO_ITEMS_BUTTON_ID)}
                type="button"
                onClick={goToItems}
                onKeyDown={(event) => handleButtonKeyDown(event, TO_ITEMS_BUTTON_ID)}
                className={primaryButton}
              >
                受注情報を確定して次へ →
              </button>
            </>
          )}

          {step === 'items' && (
            <>
              <button type="button" tabIndex={-1} onClick={backToInfo} className={secondaryButton}>
                ← 受注情報に戻る
              </button>
              <button
                ref={navigation.register(TO_INSTRUCTIONS_BUTTON_ID)}
                type="button"
                onClick={goToInstructions}
                onKeyDown={(event) => handleButtonKeyDown(event, TO_INSTRUCTIONS_BUTTON_ID)}
                className={primaryButton}
              >
                次へ →
              </button>
            </>
          )}

          {step === 'instructions' && (
            <>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => goTo('items', firstItemFieldId(items.rows[0]))}
                className={secondaryButton}
              >
                ← 注文内容に戻る
              </button>
              <button
                ref={navigation.register(SUBMIT_BUTTON_ID)}
                type="button"
                onClick={handleSubmit}
                onKeyDown={(event) => handleButtonKeyDown(event, SUBMIT_BUTTON_ID)}
                disabled={isPending}
                className={primaryButton}
              >
                {isPending ? '登録中…' : '登録して現場用伝票を印刷'}
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  )
}
