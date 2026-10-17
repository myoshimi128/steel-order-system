'use client'

// 受注登録画面のヘッダーの入力値を管理するカスタムフック。
//
//   ・各欄の入力値（番号の欄は打った番号、文字・日付の欄はその値）を持つ
//   ・部材区分（SPL はスプライス専用の受注）・納期種別・配達の値に応じて、表示する欄と入力順を決める
//   ・保存用の値（OrderHeaderInput）への変換と、保存前の確認（必須項目など）
//
// 画面の部品（components/order-entry/header/*）はこのフックの戻り値を表示するだけにする
// （CLAUDE.md「UI実装方針」）。

import { useState } from 'react'
import { findCodeOption, type CodeOption } from '@/lib/code-input/code-option'
import {
  DUE_DATE_TYPE_OPTIONS,
  dueDateTypeNeedsDate,
  MEMBER_CLASS_OPTIONS,
  PROCESSING_TYPE_OPTIONS,
  SAME_AS_CUSTOMER_CODE,
  SHOT_OPTIONS,
  SPLICE_MEMBER_CLASS,
} from './constants'
import {
  validateOrderHeader,
  type OrderHeaderErrors,
  type OrderHeaderInput,
} from './validate-order-header'

// ヘッダーの欄の ID。入力順の管理（useFieldNavigation）とエラーの表示先に使う。
// エラーを出す欄は、保存用の値（OrderHeaderInput）と同じ名前にしている
export type HeaderFieldId =
  | 'processingType'
  | 'memberClass'
  | 'jointNo'
  | 'spliceShot'
  | 'orderDate'
  | 'customerId'
  | 'customerContact'
  | 'deliveryDestinationId'
  | 'projectName'
  | 'dueDateType'
  | 'dueDate'
  | 'deliveryMethodId'
  | 'deliveryMethodNote'
  | 'siteId'

// 各欄の入力値。番号の欄（処理区分・売り先など）は、打った番号の文字列を持つ
export type HeaderValues = Record<HeaderFieldId, string>

// 欄ごとのエラー（処理区分のエラーも含む）
export type HeaderErrors = OrderHeaderErrors & { processingType?: string }

// マスタから作った選択肢（画面の page.tsx でサーバーから受け取る）
export type HeaderMasterOptions = {
  customers: readonly CodeOption<string>[]
  destinations: readonly CodeOption<string>[]
  deliveryMethods: readonly CodeOption<string>[]
  // 文字の入力が必要な配達方法（フリー）の id
  deliveryMethodIdsRequiringNote: readonly string[]
  // 加工場所（営業所。番号＝sites.number、値＝id）
  sites: readonly CodeOption<string>[]
}

// 加工場所の初期値（1 本社）。ユーザーの所属する営業所の列（users.site_id）ができたら、その営業所にする。
// 受付の機能ができたら、受付の加工場所を初期値にする
const DEFAULT_SITE_CODE = '1'

// 部材区分を SPL（スプライス専用の受注）にしたときのショットの初期値（1 有）
const SPLICE_SHOT_DEFAULT_CODE = '1'

// 新規入力の初期値。
// 処理区分（0 新規）・部材区分（0 無分類）・受注日（今日）・納期（3 後報）・配達（0 宵積み）は初期値があるため、
// Enter だけで進める。受付の機能ができたら、納期・配達などの初期値は受付の値にする
function initialValues(today: string): HeaderValues {
  return {
    processingType: '0',
    memberClass: '0',
    jointNo: '',
    spliceShot: '',
    orderDate: today,
    customerId: '',
    customerContact: '',
    // 入れ先は「0 売り先と同じ」を初期値にする（Enter だけで進める）
    deliveryDestinationId: SAME_AS_CUSTOMER_CODE,
    projectName: '',
    // 納期の初期値は 3 後報（日付なし。受付の「未定」に当たる）
    dueDateType: '3',
    dueDate: '',
    // 配達の初期値は 0 宵積み（いつもの値）
    deliveryMethodId: '0',
    deliveryMethodNote: '',
    // 加工場所の初期値は当面 1 本社
    siteId: DEFAULT_SITE_CODE,
  }
}

// 番号の欄のうち、マスタや定数の選択肢から名称を引く欄。
// 番号が入力されているのに選択肢にない場合は「存在しない番号」として扱う
type CodeFieldId =
  | 'processingType'
  | 'memberClass'
  | 'spliceShot'
  | 'customerId'
  | 'deliveryDestinationId'
  | 'dueDateType'
  | 'deliveryMethodId'
  | 'siteId'

export function useOrderHeader(masters: HeaderMasterOptions, today: string) {
  const [values, setValues] = useState<HeaderValues>(() => initialValues(today))
  const [errors, setErrors] = useState<HeaderErrors>({})

  // 番号の欄ごとの選択肢
  const codeOptions: Record<CodeFieldId, readonly CodeOption<unknown>[]> = {
    processingType: PROCESSING_TYPE_OPTIONS,
    memberClass: MEMBER_CLASS_OPTIONS,
    spliceShot: SHOT_OPTIONS,
    customerId: masters.customers,
    deliveryDestinationId: masters.destinations,
    dueDateType: DUE_DATE_TYPE_OPTIONS,
    deliveryMethodId: masters.deliveryMethods,
    siteId: masters.sites,
  }

  // 番号から選んだ値を引く（見つからなければ undefined）
  // 部材区分（未選択・存在しない番号は無分類として扱う）。SPL ならスプライス専用の受注
  const memberClass = findCodeOption(MEMBER_CLASS_OPTIONS, values.memberClass)?.value ?? 'NONE'
  const isSplice = memberClass === SPLICE_MEMBER_CLASS
  // スプライス専用の受注のショット加工の有無（未選択は null）。明細の単価の計算に使う
  const spliceShot = isSplice
    ? (findCodeOption(SHOT_OPTIONS, values.spliceShot)?.value ?? null)
    : null
  const dueDateType = findCodeOption(DUE_DATE_TYPE_OPTIONS, values.dueDateType)?.value ?? null
  const deliveryMethodId =
    findCodeOption(masters.deliveryMethods, values.deliveryMethodId)?.value ?? null
  // 選んだ得意先の id。補助エリアの注意事項の絞り込みと、指定スタンプのチェックに使う
  const customerId = findCodeOption(masters.customers, values.customerId)?.value ?? null

  // 表示を切り替える欄の条件
  const needsDueDate = dueDateTypeNeedsDate(dueDateType)
  const requiresDeliveryNote =
    deliveryMethodId !== null && masters.deliveryMethodIdsRequiringNote.includes(deliveryMethodId)

  // 入力順（① 受注情報の画面の並びどおり、左上から右下）。表示されない欄は入れない。
  // 受注 No.・受付 No. は入力できないため含めない。最後は登録ボタン（画面を進めるボタン）
  //   処理区分 → 受注日 → 売り先 → 納期 → 客先担当 → 配達 → 工事名 → 入れ先 → 加工場所 → 部材区分（→ 継手番号 → ショット）
  const fieldOrder: string[] = [
    'processingType',
    'orderDate',
    'customerId',
    'dueDateType',
    ...(needsDueDate ? ['dueDate'] : []),
    'customerContact',
    'deliveryMethodId',
    ...(requiresDeliveryNote ? ['deliveryMethodNote'] : []),
    'projectName',
    'deliveryDestinationId',
    'siteId',
    'memberClass',
    ...(isSplice ? ['jointNo', 'spliceShot'] : []),
    'submit',
  ]

  // 欄の値を変える。その欄に出ていたエラーは消す（入力し直したため）。
  // 部材区分を SPL にしたとき、ショットが空欄なら初期値の 1 有を入れる（スプライスはショット有が多いため）。
  // 一度入力したショットは、部材区分を SPL 以外に戻してまた SPL にしても、そのまま残す
  function setValue(field: HeaderFieldId, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value }
      const becomesSplice =
        field === 'memberClass' && findCodeOption(MEMBER_CLASS_OPTIONS, value)?.value === SPLICE_MEMBER_CLASS
      if (becomesSplice && next.spliceShot.trim() === '') {
        next.spliceShot = SPLICE_SHOT_DEFAULT_CODE
      }
      return next
    })
    setErrors((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  // 保存用の値に変換する。番号は選択肢の値（id など）に置き換える
  function toInput(): OrderHeaderInput {
    return {
      orderDate: values.orderDate,
      memberClass,
      isSplice,
      jointNo: isSplice ? values.jointNo.trim() : '',
      spliceShot: isSplice
        ? (findCodeOption(SHOT_OPTIONS, values.spliceShot)?.value ?? null)
        : null,
      customerId,
      customerContact: values.customerContact.trim(),
      deliveryDestinationId:
        findCodeOption(masters.destinations, values.deliveryDestinationId)?.value ?? null,
      projectName: values.projectName.trim(),
      dueDateType,
      dueDate: needsDueDate ? values.dueDate : '',
      deliveryMethodId,
      deliveryMethodNote: requiresDeliveryNote ? values.deliveryMethodNote.trim() : '',
      siteId: findCodeOption(masters.sites, values.siteId)?.value ?? null,
    }
  }

  // 保存前の確認。エラーを画面に反映し、エラーの内容を返す
  function validate(): HeaderErrors {
    const next: HeaderErrors = validateOrderHeader(toInput(), {
      deliveryMethodRequiresNote: requiresDeliveryNote,
    })

    // 変更・削除（受注の呼び出し）は次の作業で実装するため、今は新規だけを受け付ける
    const processingType = findCodeOption(PROCESSING_TYPE_OPTIONS, values.processingType)?.value
    if (processingType !== 'new') {
      next.processingType =
        processingType === undefined
          ? '処理区分を選択してください'
          : '変更・削除は現在未対応です（新規のみ登録できます）'
    }

    // 番号が入力されているのに選択肢にない欄は、「選択してください」ではなく
    // 「存在しない番号です」と表示する（入力した番号の誤りだと分かるように）
    for (const [field, options] of Object.entries(codeOptions) as [
      CodeFieldId,
      readonly CodeOption<unknown>[],
    ][]) {
      const code = values[field].trim()
      if (code && !findCodeOption(options, code) && fieldOrder.includes(field)) {
        next[field] = '存在しない番号です'
      }
    }

    setErrors(next)
    return next
  }

  // 保存後に次の受注を入力するため、初期値に戻す
  function reset() {
    setValues(initialValues(today))
    setErrors({})
  }

  return {
    values,
    errors,
    setValue,
    setErrors,
    memberClass,
    isSplice,
    spliceShot,
    customerId,
    needsDueDate,
    requiresDeliveryNote,
    fieldOrder,
    toInput,
    validate,
    reset,
  }
}

export type OrderHeaderState = ReturnType<typeof useOrderHeader>
