// 受注ヘッダーの入力内容の確認（必須項目など）。
//
// 画面（保存ボタンを押したとき）とサーバー（Server Action）の両方で同じ確認をするため、
// 画面や DB に依存しない純粋な関数にしている。
// 最終的な制約は DB（NOT NULL・チェック制約・外部キー）でも強制されるが、
// ここで先に確認することで、どの欄が問題かを画面に示せるようにする。

import {
  dueDateTypeNeedsDate,
  JOINT_NO_MAX_LENGTH,
  JOINT_NO_MIN_LENGTH,
  type DueDateType,
} from './constants'

// 保存に使うヘッダーの値。番号ではなく、保存する値（id など）に変換した後のもの
export type OrderHeaderInput = {
  // 受注日 'YYYY-MM-DD'
  orderDate: string
  isSplice: boolean
  // 継手番号（スプライス専用の受注のみ）
  jointNo: string
  // ショット加工の有無（スプライス専用の受注のみ。未選択は null）
  spliceShot: boolean | null
  customerId: string | null
  // 担当者（客先担当）。任意
  customerContact: string
  deliveryDestinationId: string | null
  // 工事名。任意
  projectName: string
  dueDateType: DueDateType | null
  // 納期 'YYYY-MM-DD'（確定・仮納期のときのみ）
  dueDate: string
  deliveryMethodId: string | null
  // 配達がフリーのときの文字
  deliveryMethodNote: string
}

// 欄ごとのエラー。キーは OrderHeaderInput の項目名
export type OrderHeaderErrors = Partial<Record<keyof OrderHeaderInput, string>>

export type OrderHeaderValidationContext = {
  // 選ばれた配達方法が文字の入力を必要とするか（delivery_methods.requires_note）
  deliveryMethodRequiresNote: boolean
}

export function validateOrderHeader(
  input: OrderHeaderInput,
  context: OrderHeaderValidationContext,
): OrderHeaderErrors {
  const errors: OrderHeaderErrors = {}

  if (!input.orderDate) {
    errors.orderDate = '受注日を入力してください'
  }

  // スプライス専用の受注は、継手番号とショットの有無が必須
  if (input.isSplice) {
    const jointNo = input.jointNo.trim()
    if (!jointNo) {
      errors.jointNo = '継手番号を入力してください'
    } else if (jointNo.length < JOINT_NO_MIN_LENGTH || jointNo.length > JOINT_NO_MAX_LENGTH) {
      errors.jointNo = `継手番号は ${JOINT_NO_MIN_LENGTH}〜${JOINT_NO_MAX_LENGTH} 文字で入力してください`
    }
    if (input.spliceShot === null) {
      errors.spliceShot = 'ショットの有無を選択してください'
    }
  }

  if (!input.customerId) {
    errors.customerId = '売り先を選択してください'
  }
  if (!input.deliveryDestinationId) {
    errors.deliveryDestinationId = '入れ先を選択してください'
  }

  if (!input.dueDateType) {
    errors.dueDateType = '納期の種別を選択してください'
  } else if (dueDateTypeNeedsDate(input.dueDateType) && !input.dueDate) {
    errors.dueDate = '納期の日付を入力してください'
  }

  if (!input.deliveryMethodId) {
    errors.deliveryMethodId = '配達を選択してください'
  } else if (context.deliveryMethodRequiresNote && !input.deliveryMethodNote.trim()) {
    errors.deliveryMethodNote = '配達の内容を入力してください'
  }

  return errors
}

// エラーが 1 つでもあるか
export function hasErrors(errors: OrderHeaderErrors): boolean {
  return Object.keys(errors).length > 0
}
