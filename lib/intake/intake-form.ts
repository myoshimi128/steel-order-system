// 受付登録（S-04c）の入力の初期値と確認（docs/intake/basic-design.md「受注情報（受付と受注で共通の入力）」）。
//
// 画面の入力の状態は useIntakeForm（lib/intake/use-intake-form.ts）が持ち、
// 「何を初期値にするか」「保存してよいか」はこのファイルの純粋な関数で決める（テストしやすくするため）。
//
// 入力値は番号の欄に打った番号（売り先のコードなど）のまま持ち、保存するときに id に置き換える。
// 欄の名前（dueDateType・deliveryMethodId など）は受注登録の受注情報（use-order-header.ts）とそろえる。
// 納期・配達の欄の部品を、受付と受注で使い回すためである。

import { findCodeOption, findOptionByValue, type CodeOption } from '@/lib/code-input/code-option'
import {
  DUE_DATE_TYPE_OPTIONS,
  dueDateTypeNeedsDate,
  SAME_AS_CUSTOMER_CODE,
  SAME_AS_CUSTOMER_DESTINATION,
  type DueDateType,
} from '@/lib/order-entry/constants'
import type { HeaderMasterOptions } from '@/lib/order-entry/use-order-header'
import { URGENT_OPTIONS } from './constants'

// 受付登録で使うマスタの選択肢。受注情報と同じもの（売り先・入れ先・配達・加工場所）に、担当者（社員）を足す
export type IntakeFormMasters = HeaderMasterOptions & {
  // 担当者（番号＝社員No.、名称＝氏名、値＝ユーザーの id）
  staff: readonly CodeOption<string>[]
}

// 入れ先以外の欄の入力値（番号の欄は打った番号、文字・日付の欄はその値）
export type IntakeFormValues = {
  intakeDate: string
  staffId: string
  customerId: string
  customerContact: string
  projectName: string
  dueDateType: string
  dueDate: string
  deliveryMethodId: string
  deliveryMethodNote: string
  siteId: string
  urgent: string
}

export type IntakeFieldId = keyof IntakeFormValues

// 入れ先の行の欄の ID（destination-0, destination-1 …）。入力順とエラーの表示先に使う
export function destinationFieldId(index: number): string {
  return `destination-${index}`
}

// 入れ先の行の数の上限（画面が縦に伸びすぎないようにする）
export const MAX_INTAKE_DESTINATIONS = 10

// 欄ごとのエラー。キーは IntakeFieldId か入れ先の欄の ID
export type IntakeFormErrors = Partial<Record<string, string>>

// 保存する値（id に置き換えた後）。Server Action に渡し、DB の関数 save_intake の引数になる
export type IntakeSavePayload = {
  intakeDate: string
  staffId: string
  customerId: string
  customerContact: string
  projectName: string
  dueDateType: DueDateType
  // 確定・仮納期のときだけ日付。それ以外は null
  dueDate: string | null
  deliveryMethodId: string
  deliveryMethodNote: string | null
  siteId: string
  isUrgent: boolean
  // 入れ先（画面の並び順）。null は「0 売り先と同じ」
  destinationIds: (string | null)[]
}

// DB に保存されている受付の受注情報（変更のときの初期値。受付待ちでは多くが空）
export type IntakeInfoSource = {
  intakeDate: string | null
  staffId: string | null
  customerId: string | null
  customerContact: string | null
  projectName: string | null
  dueDateType: DueDateType | null
  dueDate: string | null
  deliveryMethodId: string | null
  deliveryMethodNote: string | null
  siteId: string | null
  isUrgent: boolean
  // 入れ先（並び順）。null は「売り先と同じ」。1 件もなければ空の配列
  destinationIds: (string | null)[]
}

// 新規のときの初期値の元になる値
export type IntakeFormDefaults = {
  // 日本時間の今日 'YYYY-MM-DD'
  today: string
  // ログイン中のユーザーの id と、所属する営業所の id
  userId: string
  userSiteId: string | null
}

// 配達の初期値（0 宵積み）と、加工場所の初期値（ユーザーの営業所がないとき。1 本社）
const DEFAULT_DELIVERY_CODE = '0'
const DEFAULT_SITE_CODE = '1'
// 納期の初期値（3 後報。受付の段階では未定のことが多い）
const DEFAULT_DUE_DATE_TYPE_CODE = '3'

// 値（id など）から番号を引く。見つからなければ空（マスタで使わなくなった値など）
function codeOf<T>(options: readonly CodeOption<T>[], value: T | null): string {
  if (value === null) return ''
  return findOptionByValue(options, value)?.code ?? ''
}

// 画面を開いたときの入力値。保存済みの値（変更のとき）があればそれを、空の欄は新規の初期値を入れる
//   受付日: 今日 / 担当者: ログイン中のユーザー / 入れ先: 0 売り先と同じ / 納期: 3 後報 /
//   配達: 0 宵積み / 加工場所: ユーザーの営業所 / 至急: 0 通常
export function initialIntakeFormValues(
  source: IntakeInfoSource | null,
  defaults: IntakeFormDefaults,
  masters: IntakeFormMasters
): { values: IntakeFormValues; destinationCodes: string[] } {
  const dueDateTypeCode = source?.dueDateType
    ? codeOf(DUE_DATE_TYPE_OPTIONS, source.dueDateType)
    : DEFAULT_DUE_DATE_TYPE_CODE
  const userSiteCode = codeOf(masters.sites, defaults.userSiteId) || DEFAULT_SITE_CODE

  const values: IntakeFormValues = {
    intakeDate: source?.intakeDate ?? defaults.today,
    staffId: codeOf(masters.staff, source?.staffId ?? defaults.userId),
    customerId: codeOf(masters.customers, source?.customerId ?? null),
    customerContact: source?.customerContact ?? '',
    projectName: source?.projectName ?? '',
    dueDateType: dueDateTypeCode,
    dueDate: source?.dueDate ?? '',
    deliveryMethodId: source?.deliveryMethodId
      ? codeOf(masters.deliveryMethods, source.deliveryMethodId)
      : DEFAULT_DELIVERY_CODE,
    deliveryMethodNote: source?.deliveryMethodNote ?? '',
    siteId: source?.siteId ? codeOf(masters.sites, source.siteId) : userSiteCode,
    urgent: source?.isUrgent ? '1' : '0',
  }

  const destinationCodes =
    source && source.destinationIds.length > 0
      ? source.destinationIds.map((id) =>
          id === null ? SAME_AS_CUSTOMER_CODE : codeOf(masters.destinations, id)
        )
      : [SAME_AS_CUSTOMER_CODE]

  return { values, destinationCodes }
}

// 選んだ配達方法が文字の入力を必要とするか（フリー）
export function deliveryRequiresNote(values: IntakeFormValues, masters: IntakeFormMasters): boolean {
  const id = findCodeOption(masters.deliveryMethods, values.deliveryMethodId)?.value
  return id !== undefined && masters.deliveryMethodIdsRequiringNote.includes(id)
}

// 納期の日付の欄を出すか（確定・仮納期）
export function dueDateRequired(values: IntakeFormValues): boolean {
  return dueDateTypeNeedsDate(findCodeOption(DUE_DATE_TYPE_OPTIONS, values.dueDateType)?.value ?? null)
}

// 番号の欄の確認。空なら emptyMessage、選択肢にない番号なら「存在しない番号です」
function pickOption<T>(
  options: readonly CodeOption<T>[],
  code: string,
  emptyMessage: string
): { value: T } | { error: string } {
  if (code.trim() === '') return { error: emptyMessage }
  const option = findCodeOption(options, code)
  return option ? { value: option.value } : { error: '存在しない番号です' }
}

// 保存してよいかを確かめ、保存する値を作る。エラーがあれば payload は null。
// 必須は売り先だけ。受付日・担当者・納期の種別・配達・加工場所は初期値が入るため、空にしたときだけエラーにする
export function validateIntakeForm(
  values: IntakeFormValues,
  destinationCodes: readonly string[],
  masters: IntakeFormMasters
): { errors: IntakeFormErrors; payload: IntakeSavePayload | null } {
  const errors: IntakeFormErrors = {}

  if (values.intakeDate === '') errors.intakeDate = '受付日を入力してください'

  const staff = pickOption(masters.staff, values.staffId, '担当者を入力してください')
  if ('error' in staff) errors.staffId = staff.error

  const customer = pickOption(masters.customers, values.customerId, '売り先を入力してください')
  if ('error' in customer) errors.customerId = customer.error

  // 入れ先: 行ごとに番号を確かめ、同じ入れ先が 2 行あれば後の行をエラーにする
  const destinationIds: (string | null)[] = []
  const seen = new Set<string>()
  destinationCodes.forEach((code, index) => {
    const picked = pickOption(masters.destinations, code, '入れ先を入力してください')
    if ('error' in picked) {
      errors[destinationFieldId(index)] = picked.error
      return
    }
    if (seen.has(picked.value)) {
      errors[destinationFieldId(index)] = '同じ入れ先がすでにあります'
      return
    }
    seen.add(picked.value)
    destinationIds.push(picked.value === SAME_AS_CUSTOMER_DESTINATION ? null : picked.value)
  })
  if (destinationCodes.length === 0) errors[destinationFieldId(0)] = '入れ先を入力してください'

  const dueDateType = pickOption(DUE_DATE_TYPE_OPTIONS, values.dueDateType, '納期の種別を入力してください')
  if ('error' in dueDateType) errors.dueDateType = dueDateType.error
  const needsDueDate = dueDateRequired(values)
  if (needsDueDate && values.dueDate === '') errors.dueDate = '納期の日付を入力してください'

  const delivery = pickOption(masters.deliveryMethods, values.deliveryMethodId, '配達を入力してください')
  if ('error' in delivery) errors.deliveryMethodId = delivery.error
  const requiresNote = deliveryRequiresNote(values, masters)
  if (requiresNote && values.deliveryMethodNote.trim() === '') {
    errors.deliveryMethodNote = '配達の内容を入力してください'
  }

  const site = pickOption(masters.sites, values.siteId, '加工場所を入力してください')
  if ('error' in site) errors.siteId = site.error

  const urgent = pickOption(URGENT_OPTIONS, values.urgent, '至急を入力してください（0 通常 / 1 至急）')
  if ('error' in urgent) errors.urgent = urgent.error

  if (
    Object.keys(errors).length > 0 ||
    'error' in staff ||
    'error' in customer ||
    'error' in dueDateType ||
    'error' in delivery ||
    'error' in site ||
    'error' in urgent
  ) {
    return { errors, payload: null }
  }

  return {
    errors,
    payload: {
      intakeDate: values.intakeDate,
      staffId: staff.value,
      customerId: customer.value,
      customerContact: values.customerContact.trim(),
      projectName: values.projectName.trim(),
      dueDateType: dueDateType.value,
      dueDate: needsDueDate ? values.dueDate : null,
      deliveryMethodId: delivery.value,
      deliveryMethodNote: requiresNote ? values.deliveryMethodNote.trim() : null,
      siteId: site.value,
      isUrgent: urgent.value,
      destinationIds,
    },
  }
}
