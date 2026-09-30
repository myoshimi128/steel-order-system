// 受注登録画面の固定の選択肢と、その番号。
//
// 今後増える可能性がない選択肢は、マスタではなくアプリ側の定数で持つ
// （docs/table-design.md「受注登録画面のための追加方針」）。
// DB に保存するのは番号ではなく値（例: 納期種別は '確定'）で、番号は画面の入力にだけ使う。
// 番号の一覧は docs/screen-design.md「番号の一覧」と一致させること。

import type { CodeOption } from '@/lib/code-input/code-option'

// --- 処理区分 ---
export type ProcessingType = 'new' | 'edit' | 'delete'

export const PROCESSING_TYPE_OPTIONS: readonly CodeOption<ProcessingType>[] = [
  { code: '0', label: '新規', value: 'new' },
  { code: '1', label: '変更', value: 'edit' },
  { code: '2', label: '削除', value: 'delete' },
]

// --- スプライス（通常の受注か、スプライス専用の受注か） ---
export const SPLICE_OPTIONS: readonly CodeOption<boolean>[] = [
  { code: '0', label: '通常', value: false },
  { code: '1', label: 'スプライス', value: true },
]

// --- ショット（スプライス専用の受注のショット加工の有無） ---
export const SHOT_OPTIONS: readonly CodeOption<boolean>[] = [
  { code: '0', label: '無', value: false },
  { code: '1', label: '有', value: true },
]

// --- 納期種別（orders.due_date_type の値域と一致させる） ---
export type DueDateType = '確定' | '仮納期' | '後報' | '最短出荷'

export const DUE_DATE_TYPE_OPTIONS: readonly CodeOption<DueDateType>[] = [
  { code: '1', label: '確定', value: '確定' },
  { code: '2', label: '仮納期', value: '仮納期' },
  { code: '3', label: '後報', value: '後報' },
  { code: '4', label: '最短出荷', value: '最短出荷' },
]

// 納期の日付が必要な納期種別（確定・仮納期）。
// 後報（待ち）・最短出荷（急ぎ）は日付を持たない（orders_due_date_required_check と同じ条件）
export function dueDateTypeNeedsDate(dueDateType: DueDateType | null): boolean {
  return dueDateType === '確定' || dueDateType === '仮納期'
}

// 継手番号の文字数（orders_splice_columns_check と同じ条件）
export const JOINT_NO_MIN_LENGTH = 4
export const JOINT_NO_MAX_LENGTH = 6


// ============================================================
// 明細（材料の行）
// ============================================================

// --- 切断方法 ---
// 9 定尺は切断を伴わない定尺売り。選ぶと区分も 3 定尺に固定され、cutting_method は NULL で保存する
export type CuttingMethodChoice = 'シャーリング' | 'ガス' | 'レーザー' | 'プラズマ' | '定尺'

export const CUTTING_METHOD_OPTIONS: readonly CodeOption<CuttingMethodChoice>[] = [
  { code: '1', label: 'シャーリング', value: 'シャーリング' },
  { code: '2', label: 'ガス', value: 'ガス' },
  { code: '3', label: 'レーザー', value: 'レーザー' },
  { code: '4', label: 'プラズマ', value: 'プラズマ' },
  { code: '9', label: '定尺', value: '定尺' },
]

// --- 区分（固定の分） ---
// ササラ・ベタ丸・ドーナツは特殊製品種別マスタの番号で選ぶ（lib/order-entry/item-options.ts で合わせて作る）
export type FixedRegion = '寸法切' | 'アイトレ' | '定尺' | '加工'

export const FIXED_REGION_OPTIONS: readonly CodeOption<FixedRegion>[] = [
  { code: '1', label: '寸法切', value: '寸法切' },
  { code: '2', label: 'アイトレ', value: 'アイトレ' },
  { code: '3', label: '定尺', value: '定尺' },
  { code: '9', label: '加工', value: '加工' },
]

// 切断方法 9 定尺を選んだときに固定する区分の番号
export const STANDARD_REGION_CODE = '3'

// --- 製鋼法（order_items.steel_making の値域と一致させる） ---
export type SteelMakingValue = '電炉材' | '高炉材'

export const STEEL_MAKING_OPTIONS: readonly CodeOption<SteelMakingValue>[] = [
  { code: '1', label: '電炉', value: '電炉材' },
  { code: '2', label: '高炉', value: '高炉材' },
]

// --- 定尺サイズ（order_items.plate_size の値域と一致させる） ---
export type PlateSizeValue = '3x6' | '4x8' | '5x10'

export const PLATE_SIZE_OPTIONS: readonly CodeOption<PlateSizeValue>[] = [
  { code: '1', label: '3x6', value: '3x6' },
  { code: '2', label: '4x8', value: '4x8' },
  { code: '3', label: '5x10', value: '5x10' },
]

// --- 「0 はいつもの値（初期値）」 ---
// 受注登録画面の番号入力では、最も多く使う値に番号 0 を割り当て、欄の初期値にする
// （docs/screen-design.md「番号の一覧」）。初期値の欄は Enter だけで次へ進める。
//   種類 0 普通板 / 材質 0 SS400 / メーカー 0 指定なし
export const USUAL_VALUE_CODE = '0'

// --- メーカー ---
// 「0 指定なし」はマスタの行ではなく、manufacturer_specified_id を NULL にすることを表す
export const NO_MANUFACTURER_CODE = USUAL_VALUE_CODE

// 定尺（5'x10'）の寸法（mm）。これを超える部品は大板から切り出す
export const STANDARD_PLATE_WIDTH = 1524
export const STANDARD_PLATE_LENGTH = 3048
