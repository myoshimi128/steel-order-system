'use client'

// 受付登録（S-04c）の入力の状態を持つカスタムフック。
//
//   ・入れ先以外の欄の入力値（番号の欄は打った番号）と、入れ先の行（複数）
//   ・欄ごとのエラー。入力し直した欄のエラーは消す
//   ・納期の日付の欄・配達の文字の欄を出すか
//   ・入力順（Enter で進む順）。表示されていない欄は入れない
//   ・保存前の確認（validateIntakeForm）
// 初期値と確認の中身は lib/intake/intake-form.ts の純粋な関数に任せる。
// 戻り値の values / errors / setValue / needsDueDate / requiresDeliveryNote は、
// 受注情報の納期・配達の欄の部品（DueDateFields・DeliveryFields）にそのまま渡せる形にしている。

import { useState } from 'react'
import {
  deliveryRequiresNote,
  destinationFieldId,
  dueDateRequired,
  MAX_INTAKE_DESTINATIONS,
  validateIntakeForm,
  type IntakeFieldId,
  type IntakeFormErrors,
  type IntakeFormMasters,
  type IntakeFormValues,
  type IntakeSavePayload,
} from './intake-form'
import { SAME_AS_CUSTOMER_CODE } from '@/lib/order-entry/constants'

type InitialValues = { values: IntakeFormValues; destinationCodes: string[] }

// 欄のエラーを 1 つ消す（入力し直したため）
function withoutError(errors: IntakeFormErrors, id: string): IntakeFormErrors {
  if (!(id in errors)) return errors
  const next = { ...errors }
  delete next[id]
  return next
}

export function useIntakeForm(masters: IntakeFormMasters, initial: InitialValues) {
  const [values, setValues] = useState<IntakeFormValues>(initial.values)
  const [destinationCodes, setDestinationCodes] = useState<string[]>(initial.destinationCodes)
  const [errors, setErrors] = useState<IntakeFormErrors>({})

  const needsDueDate = dueDateRequired(values)
  const requiresDeliveryNote = deliveryRequiresNote(values, masters)

  function setValue(field: IntakeFieldId, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => withoutError(current, field))
  }

  function setDestination(index: number, code: string) {
    setDestinationCodes((current) => current.map((item, i) => (i === index ? code : item)))
    setErrors((current) => withoutError(current, destinationFieldId(index)))
  }

  // 入れ先の行を 1 行足す（上限まで）。足した行の欄の ID を返す（その欄へカーソルを移すため）
  function addDestination(): string | null {
    if (destinationCodes.length >= MAX_INTAKE_DESTINATIONS) return null
    const index = destinationCodes.length
    // 「売り先と同じ」がまだなければ 0 を、あれば空の行を足す（同じ入れ先は 2 行入れられないため）
    const code = destinationCodes.includes(SAME_AS_CUSTOMER_CODE) ? '' : SAME_AS_CUSTOMER_CODE
    setDestinationCodes((current) => [...current, code])
    return destinationFieldId(index)
  }

  // 入れ先の行を消す（最後の 1 行は消さない）。行の番号がずれるため、入れ先のエラーはすべて消す
  function removeDestination(index: number) {
    if (destinationCodes.length <= 1) return
    setDestinationCodes((current) => current.filter((_, i) => i !== index))
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith('destination-')))
    )
  }

  // 入力順（Enter で進む順）。処理区分・受付No. などの上の欄は、画面の部品から先頭に足してもらう
  //   受付日 → 担当者 → 売り先 → 客先担当 → 入れ先（行の数だけ）→ 工事名 → 納期（→ 日付）→ 配達（→ 文字）→ 加工場所 → 至急
  const fieldOrder: string[] = [
    'intakeDate',
    'staffId',
    'customerId',
    'customerContact',
    ...destinationCodes.map((_, index) => destinationFieldId(index)),
    'projectName',
    'dueDateType',
    ...(needsDueDate ? ['dueDate'] : []),
    'deliveryMethodId',
    ...(requiresDeliveryNote ? ['deliveryMethodNote'] : []),
    'siteId',
    'urgent',
  ]

  // 保存前の確認。エラーを画面に出し、保存してよければ保存する値を返す。
  // エラーがあれば、最初にエラーのある欄の ID も返す（その欄へカーソルを移すため）
  function validate(): { payload: IntakeSavePayload | null; firstErrorField: string | null } {
    const result = validateIntakeForm(values, destinationCodes, masters)
    setErrors(result.errors)
    return {
      payload: result.payload,
      firstErrorField: fieldOrder.find((id) => result.errors[id] !== undefined) ?? null,
    }
  }

  return {
    values,
    destinationCodes,
    errors,
    setValue,
    setDestination,
    addDestination,
    removeDestination,
    canAddDestination: destinationCodes.length < MAX_INTAKE_DESTINATIONS,
    needsDueDate,
    requiresDeliveryNote,
    fieldOrder,
    validate,
  }
}

export type IntakeFormState = ReturnType<typeof useIntakeForm>
