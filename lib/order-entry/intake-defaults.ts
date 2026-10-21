// 受注情報（① 受注情報）の初期値を、受付の値から作る（docs/intake/basic-design.md「受注情報（受付と受注で共通の入力）」）。
//
// 受注登録は受注登録待ちの一覧の行（加工区分）から始める。そのとき、受付で入れた値を受注情報の初期値にする。
//   ・売り先・客先担当・工事名・配達（とそのメモ）・加工場所・至急 : 受付の値
//   ・入れ先 : 受付の入れ先の 1 件目（受付の入れ先は「/」の一覧の先頭に「受付 1」「受付 2」…の印を付けて並べる）
//   ・納期   : 受付に日付があれば「確定」とその日付、なければ「後報」。
//              受付で「仮納期」「最短出荷」を選んでいれば、その種別のまま（仮納期は日付も）
//   ・担当者（自社）: ログイン中のユーザー（受付の担当者ではない。起票した人を残すため）
//   ・部材区分（0 無分類）・受注日（今日）・処理区分（0 新規）: 受付にない項目のため、いつもの初期値
// 受付から入った値は画面で薄い青に見せ、手で直した欄は通常の見た目に戻す（isFromIntake）。
// どれも画面や DB に依存しない純粋な関数にして、テストする。

import type { CodeOption } from '@/lib/code-input/code-option'
import type { IntakeFile } from '@/lib/intake/types'
import type { WorkUnitKind, WorkUnitOrigin } from '@/lib/intake/constants'
import {
  DUE_DATE_TYPE_OPTIONS,
  SAME_AS_CUSTOMER_CODE,
  SAME_AS_CUSTOMER_DESTINATION,
  type DueDateType,
  type MemberClass,
} from './constants'

// 受注登録の画面で使う、受付と加工区分の情報（受注登録待ちの一覧で選んだ行。lib/intake/load-order-intake-source.ts で読む）
export type OrderIntakeSource = {
  intakeId: string
  workUnitId: string
  intakeNo: string
  // 加工区分（先寸・アイトレ）と作られ方（振り分け・見落とし追加など）
  kind: WorkUnitKind
  origin: WorkUnitOrigin
  // 加工区分が受注登録待ち（ready）か。起票完了済みなどなら登録させない
  isReady: boolean
  // 受付の担当者の名前（上部に「受付: ○○」と出す）
  intakeStaffName: string | null
  // 受付の受注情報（受注情報の初期値の元）
  customerId: string | null
  customerContact: string | null
  // 受付の入れ先（並び順。null は「売り先と同じ」）
  destinationIds: (string | null)[]
  projectName: string | null
  dueDateType: DueDateType | null
  dueDate: string | null
  deliveryMethodId: string | null
  deliveryMethodNote: string | null
  siteId: string | null
  // 受付の加工場所の営業所のコード（受注登録待ちの一覧のタブへ戻るリンクに使う）
  siteCode: string | null
  isUrgent: boolean
  // 次に登録すると付く枝番（表示だけ。本当の枝番は登録のときに DB が採番する）
  nextBranchNo: number
  // この受付の登録済みの受注（受注No. と部材区分）
  registeredOrders: { orderNo: string; memberClass: MemberClass }[]
  // 注文書のパネルに出すファイル（受付の注文書 PDF と、この加工区分のファイル）
  files: IntakeFile[]
}

// 受付から初期値を入れる受注情報の欄（画面で薄い青に見せる欄）
export const INTAKE_DEFAULT_FIELDS = [
  'customerId',
  'customerContact',
  'deliveryDestinationId',
  'projectName',
  'dueDateType',
  'dueDate',
  'deliveryMethodId',
  'deliveryMethodNote',
  'siteId',
  'isUrgent',
] as const

export type IntakeDefaultField = (typeof INTAKE_DEFAULT_FIELDS)[number]

// 受付の値から作った初期値（番号の欄は打つ番号、文字・日付の欄はその値）
export type IntakeHeaderDefaults = Record<IntakeDefaultField, string>

// 受注の納期の初期値。受付に日付があれば「確定」、なければ「後報」。仮納期・最短出荷は種別をそのまま
export function orderDueDateDefault(
  dueDateType: DueDateType | null,
  dueDate: string | null
): { dueDateType: DueDateType; dueDate: string } {
  if (dueDateType === '仮納期' && dueDate) return { dueDateType: '仮納期', dueDate }
  if (dueDateType === '最短出荷') return { dueDateType: '最短出荷', dueDate: '' }
  if (dueDate) return { dueDateType: '確定', dueDate }
  return { dueDateType: '後報', dueDate: '' }
}

// 保存されている値（id など）から、打つ番号を引く。見つからなければ空
function codeOf<T>(options: readonly CodeOption<T>[], value: T | null): string {
  if (value === null) return ''
  return options.find((option) => option.value === value)?.code ?? ''
}

// 入れ先の id（null は売り先と同じ）から、打つ番号を引く
function destinationCodeOf(destinations: readonly CodeOption<string>[], id: string | null): string {
  if (id === null) return SAME_AS_CUSTOMER_CODE
  return codeOf(destinations, id)
}

type DefaultsMasters = {
  customers: readonly CodeOption<string>[]
  destinations: readonly CodeOption<string>[]
  deliveryMethods: readonly CodeOption<string>[]
  sites: readonly CodeOption<string>[]
}

// 受付の値から、受注情報の初期値を作る
export function intakeHeaderDefaults(source: OrderIntakeSource, masters: DefaultsMasters): IntakeHeaderDefaults {
  const due = orderDueDateDefault(source.dueDateType, source.dueDate)
  return {
    customerId: codeOf(masters.customers, source.customerId),
    customerContact: source.customerContact ?? '',
    // 受付の入れ先の 1 件目。受付に入れ先がなければ「0 売り先と同じ」
    deliveryDestinationId: destinationCodeOf(masters.destinations, source.destinationIds[0] ?? null),
    projectName: source.projectName ?? '',
    dueDateType: codeOf(DUE_DATE_TYPE_OPTIONS, due.dueDateType),
    dueDate: due.dueDate,
    deliveryMethodId: codeOf(masters.deliveryMethods, source.deliveryMethodId),
    deliveryMethodNote: source.deliveryMethodNote ?? '',
    siteId: codeOf(masters.sites, source.siteId),
    isUrgent: source.isUrgent ? '1' : '0',
  }
}

// 入れ先の「/」の一覧の選択肢。受付の入れ先を「受付 1」「受付 2」…の印を付けて先頭に並べ、その下に納入先マスタを並べる
// （同じ入れ先が 2 回出ないよう、先頭に出したものはマスタの並びから外す）
export function destinationOptionsWithIntake(
  destinationIds: readonly (string | null)[],
  destinations: readonly CodeOption<string>[]
): CodeOption<string>[] {
  const values = destinationIds.map((id) => id ?? SAME_AS_CUSTOMER_DESTINATION)
  const fromIntake = values.flatMap((value, index) => {
    const option = destinations.find((item) => item.value === value)
    return option ? [{ ...option, label: `受付 ${index + 1}｜${option.label}` }] : []
  })
  const shown = new Set(fromIntake.map((option) => option.value))
  return [...fromIntake, ...destinations.filter((option) => !shown.has(option.value))]
}

// 欄の今の値が、受付から入った値のままか（画面で薄い青に見せる）。手で直したら false
export function isFromIntake(
  field: string,
  value: string,
  defaults: IntakeHeaderDefaults | null
): boolean {
  if (!defaults || !(INTAKE_DEFAULT_FIELDS as readonly string[]).includes(field)) return false
  const original = defaults[field as IntakeDefaultField]
  // 受付で空だった欄（客先担当がないなど）は、受付の値として見せない
  return original !== '' && value === original
}

// 上部に出す「次の受注No.」（26-1003-2）
export function nextOrderNoText(source: Pick<OrderIntakeSource, 'intakeNo' | 'nextBranchNo'>): string {
  return `${source.intakeNo}-${source.nextBranchNo}`
}
