'use client'

// 受注登録画面の全体（docs/screen-design.md「受注登録画面」）。
// ① 受注情報 → ② 注文内容 の 2 つの画面を、このページの中で切り替える。
// ② は明細の表の下にスタンプ・フリーコメントの帯を置き、② で登録する。
// 画面を移っても入力した内容は消えない（入力値は 2 つの画面で共通のフックが持つ）。
//
//   入力値  : useOrderHeader（受注情報）・useOrderItems（明細）・useOrderAux（スタンプ・フリーコメント）
//   計算    : useItemCalculations（重量。仕入単価も裏で計算するが画面には出さない）
//   注意事項: notices.ts（得意先と明細の内容から、受注に関係するものだけに絞り込む。表示のみ）
//   欄の移動: useFieldNavigation（今の画面の欄だけを入力順に並べる）
//   注文書  : useDocumentPanel（左のパネルの幅と開閉。F2 で開閉）
//   受付  : 受注登録待ちの加工区分から開く。受付の値を受注情報の初期値にし（intake-defaults.ts）、
//           注文書のパネルに受付の注文書 PDF とこの区分のファイルを出す。登録すると受付No.＋枝番の受注No. が付く
// ここでは画面の切り替えと保存の流れ（確認 → Server Action の呼び出し → 結果の表示 → 登録後の選択）だけを扱う。

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition, type KeyboardEvent } from 'react'
import { createOrder } from '@/app/(main)/orders/new/actions'
import { completeWorkUnit } from '@/app/(main)/orders/queue/actions'
import { queueHref } from '@/lib/intake/queue'
import { findCodeOption } from '@/lib/code-input/code-option'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { DUE_DATE_TYPE_OPTIONS, MEMBER_CLASS_OPTIONS } from '@/lib/order-entry/constants'
import { intakeHeaderDefaults, nextOrderNoText, type OrderIntakeSource } from '@/lib/order-entry/intake-defaults'
import { firstItemFieldId, itemFieldId, itemFieldOrder } from '@/lib/order-entry/item-row'
import type { ItemFieldName } from '@/lib/order-entry/item-types'
import type { OrderEntryMasters } from '@/lib/order-entry/load-order-entry-masters'
import { customerNoticesFor, orderNoticeConditions } from '@/lib/order-entry/notices'
import { SUBMIT_BUTTON_ID, TO_ITEMS_BUTTON_ID, type OrderEntryStep } from '@/lib/order-entry/order-entry-steps'
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
import { RegisteredDialog } from './registered-dialog'
import { StepIndicator } from './step-indicator'
import { AuxArea } from './support-area/aux-area'
import { CustomerNoticeStrip } from './support-area/customer-notice-strip'

type OrderEntryScreenProps = {
  masters: OrderEntryMasters
  // 日本時間の今日の日付 'YYYY-MM-DD'（サーバーで求めて渡す）
  today: string
  // 注文書のパネルの保存されている幅と開閉（サーバーが cookie から読む）
  initialPanelWidth: number | null
  initialPanelOpen: boolean
  // 受注登録待ちの一覧で選んだ加工区分と、その受付の情報（受注情報の初期値・注文書のパネル・上部の表示）
  intake: OrderIntakeSource
  // ログイン中のユーザーの社員No.（担当者の初期値）
  staffCode: string
}

type StatusMessage = { kind: 'success' | 'error' | 'info'; text: string }

// 'YYYY-MM-DD' を要約に出す「MM/DD」にする
function shortDate(value: string): string {
  return value ? value.slice(5).replace('-', '/') : ''
}

export function OrderEntryScreen({
  masters,
  today,
  initialPanelWidth,
  initialPanelOpen,
  intake,
  staffCode,
}: OrderEntryScreenProps) {
  const router = useRouter()
  const [step, setStep] = useState<OrderEntryStep>('info')

  // 受注情報の初期値の元（担当者はログイン中のユーザー、それ以外は受付の値）。画面を開いたときに 1 回だけ作る
  const [headerDefaults] = useState(() => ({
    staffCode,
    intake: intakeHeaderDefaults(intake, masters.header),
  }))
  const header = useOrderHeader(masters.header, today, headerDefaults)
  // スプライス専用の受注か（部材区分が SPL）とショットの有無で、明細の番号の解釈と単価が変わる。
  // 部材区分を切り替えても明細は残し、切り替え後の受注で使えない番号の行にはエラーを出す
  const context = { isSplice: header.isSplice, spliceShot: header.spliceShot }
  const items = useOrderItems(masters.items, context)
  // 単価の基準日は受注日（料金改定があっても受注日時点の単価を使う）
  const { rows: calculations, totals } = useItemCalculations(items.rows, items.checks, header.values.orderDate)

  // スタンプ・フリーコメント。得意先を選ぶと、その得意先の指定スタンプにチェックが入る
  const aux = useOrderAux(masters.aux, header.customerId)
  // 得意先の注意事項。得意先・切断方法・加工種別の条件がすべて受注に当てはまるものだけ。
  // ② 注文内容の明細の上に出す
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

  // 画面ごとの入力順。今の画面の欄だけを並べ、最後は画面を進めるボタン・登録ボタン。
  // ② は 明細 →（最後の空の行で Enter）→ スタンプの番号 → フリーコメント → 登録
  const infoOrder = [...header.fieldOrder.filter((id) => id !== 'submit'), TO_ITEMS_BUTTON_ID]
  const itemsOrder = [
    ...items.rows.flatMap((row, index) => {
      const check = items.checks[index]
      // 加工の行は入力順が決まっているため、材料の行の判定（材質・製鋼法の有無）は使わない
      const flags =
        check.kind === 'material' ? check.resolved : { needsMaterial: false, steelMakingApplicable: false }
      return itemFieldOrder(row, flags, masters.items, context)
    }),
    STAMP_CODE_FIELD_ID,
    FREE_COMMENT_FIELD_ID,
    SUBMIT_BUTTON_ID,
  ]
  const fieldOrder = step === 'info' ? infoOrder : itemsOrder
  const navigation = useFieldNavigation(fieldOrder)

  // 画面を開いたら、最初の欄（処理区分）にカーソルを置く
  const { focusFirst } = navigation
  useEffect(() => {
    focusFirst()
  }, [focusFirst])

  const [isPending, startTransition] = useTransition()
  // 画面下部に出すメッセージ（保存の結果・キー操作の案内など）
  const [status, setStatus] = useState<StatusMessage | null>(null)
  // 登録した受注No.（登録の後に、続けて登録するか・起票を完了するかを選ぶ画面を出す）
  const [registeredOrderNo, setRegisteredOrderNo] = useState<string | null>(null)
  const [completing, startCompleting] = useTransition()
  const [completeError, setCompleteError] = useState<string | null>(null)
  // 戻る先の受注登録待ちのタブ（加工場所を変えて登録したときは、受付の加工場所も変わるため、利用者の営業所のタブを開く）
  const queueSiteCode = header.siteChangedFromIntake ? null : intake.siteCode

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

  // 登録。① ② の入力をまとめて確認し、エラーがあればその画面に戻ってエラーの欄にカーソルを置く
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
      const response = await createOrder(headerInput, itemRows, auxInput, {
        intakeId: intake.intakeId,
        workUnitId: intake.workUnitId,
      })
      if (response.ok) {
        setStatus({ kind: 'success', text: `受注No. ${response.orderNo} を登録しました` })
        // 続けて登録するか・この区分の起票を完了するかを選ぶ（RegisteredDialog）
        setRegisteredOrderNo(response.orderNo)
        setCompleteError(null)
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

  // 登録の後: 同じ区分で続けて登録する。明細・スタンプ・フリーコメントを空にし、受注情報を受付の初期値に戻す。
  // 画面を作り直して（router.refresh）、上部の次の枝番と登録済みの受注を新しくする
  function continueSameUnit() {
    header.reset()
    items.reset()
    aux.reset()
    setRegisteredOrderNo(null)
    goTo('info', 'processingType')
    router.refresh()
  }

  // 登録の後: この区分の起票を完了して、受注登録待ちの一覧に戻る（一覧から消える）
  function completeAndReturn() {
    setCompleteError(null)
    startCompleting(async () => {
      const result = await completeWorkUnit(intake.workUnitId)
      if (!result.ok) {
        setCompleteError(result.error)
        return
      }
      router.push(queueHref({ site: queueSiteCode, notice: 'completed', no: intake.intakeNo }))
    })
  }

  // 画面を進めるボタンでも Shift+Enter で前の欄へ戻れるようにする（Enter はボタンの既定動作で押される）
  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === 'Enter' && event.shiftKey) {
      event.preventDefault()
      navigation.focusPrevious(id)
    }
  }

  // ② の上部に出す受注情報の要約
  const summary = [
    { label: '受注No.', value: `${nextOrderNoText(intake)}（登録時に採番）` },
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
        <h1 className="shrink-0 text-xl font-bold text-navy">受注登録</h1>
        <StepIndicator current={step} withQueue />
      </div>

      {/* 左に注文書のパネル、右に画面ごとの中身。パネルの最大の幅は、この枠の幅から決まる */}
      <div ref={setPanelContainer} className="flex min-h-0 flex-1 gap-4">
        <DocumentPanel panel={panel} files={intake.files} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded border border-line bg-white">
          {step === 'info' && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <OrderHeader
                header={header}
                navigation={navigation}
                masters={masters.header}
                today={today}
                intake={intake}
              />
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
                // 明細の最後の空の行で Enter を押したら、スタンプの番号の欄へ移る
                finishFieldId={STAMP_CODE_FIELD_ID}
                navigation={navigation}
                onNotice={(text) => setStatus({ kind: 'info', text })}
              />
              {/* 明細の表の下に、スタンプとフリーコメントを横に並べた帯（高さを抑えて明細の行数を確保する） */}
              <AuxArea aux={aux} showShotStamp={showShotStamp} navigation={navigation} />
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

      {registeredOrderNo && (
        <RegisteredDialog
          orderNo={registeredOrderNo}
          intakeNo={intake.intakeNo}
          completing={completing}
          error={completeError}
          onContinue={continueSameUnit}
          onComplete={completeAndReturn}
          onBackToQueue={() => router.push(queueHref({ site: queueSiteCode }))}
        />
      )}
    </div>
  )
}
