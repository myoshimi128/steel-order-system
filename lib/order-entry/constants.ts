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

// --- 部材区分（orders.member_class の値域と一致させる） ---
// 部品ごとに受注を分けるときに使い、後の工程管理で利用する。
// SPL を選んだ受注がスプライス専用の受注になる（以前の「スプライス 0 / 1」の欄の代わり。
// 部材区分とは別にスプライスの印を持つと食い違うおそれがあるため、1 つにまとめた）
export type MemberClass = 'NONE' | 'DF' | 'GPL' | 'BH' | 'SPL'

export const MEMBER_CLASS_OPTIONS: readonly CodeOption<MemberClass>[] = [
  { code: '0', label: '無分類', value: 'NONE' },
  { code: '1', label: 'DF', value: 'DF' },
  { code: '2', label: 'GPL', value: 'GPL' },
  { code: '3', label: 'BH', value: 'BH' },
  { code: '4', label: 'SPL', value: 'SPL' },
]

// スプライス専用の受注になる部材区分
export const SPLICE_MEMBER_CLASS: MemberClass = 'SPL'

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

// 継手番号の文字数の上限（orders_splice_columns_check と同じ条件）。
// 継手番号は任意で、下限はない（長い番号もあるため上限だけを決める）
export const JOINT_NO_MAX_LENGTH = 10

// --- 入れ先の「0 売り先と同じ」 ---
// 入れ先が売り先と同じ場合は、入れ先の番号の欄に 0 を入れる（初期値）。
// 保存時は orders.delivery_destination_id を NULL にする（docs/screen-design.md「ヘッダー」）。
// 納入先マスタのコードに 0 は使えない（delivery_destinations_code_not_zero_check）ため、区別できる
export const SAME_AS_CUSTOMER_CODE = '0'
// 選択肢の値。納入先の id（uuid）と重ならない文字列にして、「売り先と同じ」を選んだことを表す
export const SAME_AS_CUSTOMER_DESTINATION = 'same-as-customer'

export const SAME_AS_CUSTOMER_OPTION: CodeOption<string> = {
  code: SAME_AS_CUSTOMER_CODE,
  label: '売り先と同じ',
  value: SAME_AS_CUSTOMER_DESTINATION,
}


// ============================================================
// 明細（材料の行）
// ============================================================

// --- 切断・区分（切断方法と区分をまとめた 2 桁の番号） ---
// docs/screen-design.md「切断・区分の番号」。十の位が切断方法、一の位が区分。
//   11 シャー寸法切 / 12 シャー型切り / 21・31・41 寸法切 / 22・32・42 アイトレ /
//   25・27・28 など 特殊製品（一の位は特殊製品種別マスタの番号）/ 71 定尺 / 9 加工
// 組み合わせの一覧は lib/order-entry/item-options.ts の cutRegionEntries で作る。
//
// 定尺売りは切断を伴わないが、画面の扱いをそろえるため、切断方法の値として '定尺' を持つ
// （保存時は cutting_method を NULL にする）
export type CuttingMethodChoice = 'シャーリング' | 'ガス' | 'プラズマ' | 'レーザー' | '定尺'

// 十の位（切断方法）。short は表の中に出す短い名前（例: 「シャー寸法切」）
export type CuttingMethodDigit = {
  digit: string
  value: Exclude<CuttingMethodChoice, '定尺'>
  short: string
  // 特殊製品（ササラ・ベタ丸・ドーナツ）を作る切断方法か（シャーリングでは作らない）
  makesSpecialProducts: boolean
}

export const CUTTING_METHOD_DIGITS: readonly CuttingMethodDigit[] = [
  { digit: '1', value: 'シャーリング', short: 'シャー', makesSpecialProducts: false },
  { digit: '2', value: 'ガス', short: 'ガス', makesSpecialProducts: true },
  { digit: '3', value: 'プラズマ', short: 'プラズマ', makesSpecialProducts: true },
  { digit: '4', value: 'レーザー', short: 'レーザー', makesSpecialProducts: true },
]

// 一の位（区分）のうち固定のもの。1 寸法切 / 2 アイトレ（シャーリングでは「型切り」と表示する）
export const CUT_TYPE_DIGITS = { 寸法切: '1', アイトレ: '2' } as const

// シャーリングのアイトレの表示名。保存する値はアイトレのまま（新しい切断区分は作らない）
export const SHEARING_IRREGULAR_CUT_LABEL = '型切り'

// 71 定尺（定尺売り）
export const STANDARD_CUT_REGION_CODE = '71'

// 9 加工（この番号の行は加工の行になる。同じ欄で続けて加工方法の番号を打つ）
export const PROCESS_REGION_CODE = '9'

// --- 加工の行の単位（order_item_processes.price_unit の値域と一致させる） ---
//   個: 仕入金額 = 仕入単価 × 数量
//   kg: 仕入金額 = 仕入単価 × 母材の合計重量
export type ProcessPriceUnit = '個' | 'kg'

export const PROCESS_PRICE_UNIT_OPTIONS: readonly CodeOption<ProcessPriceUnit>[] = [
  { code: '1', label: '個', value: '個' },
  { code: '2', label: 'kg', value: 'kg' },
]

// --- 加工種別の「入力の形」（process_types.input_shape の値域と一致させる） ---
// 加工の行の項目の入力欄と、数量の求め方を決める（docs/basic-design.md「加工の入力項目」）
export type ProcessInputShape = '自由入力' | '穴' | '曲げ'

// 加工種別マスタの画面で選ぶ入力の形の一覧（label は選択肢に添える説明）
export const PROCESS_INPUT_SHAPES: readonly { value: ProcessInputShape; label: string }[] = [
  { value: '自由入力', label: '自由入力（加工内容を文字で入力。数量は手入力）' },
  { value: '穴', label: '穴（1 枚あたりの孔数・穴径。数量は孔数 × 枚数）' },
  { value: '曲げ', label: '曲げ（ヶ所・曲げ方。数量は材料と同じ枚数）' },
]

// 加工方法が決まっていない（または存在しない番号の）加工の行は、自由入力の形として扱う
export const DEFAULT_PROCESS_INPUT_SHAPE: ProcessInputShape = '自由入力'

// 曲げのヶ所・曲げ方で「フリー」（数字・文字を入力する）を表す番号
export const FREE_INPUT_CODE = '9'

// --- 曲げのヶ所 ---
// 値はヶ所数。9 フリーは右に現れる欄に数字で入力するため、値は null
export const BEND_COUNT_OPTIONS: readonly CodeOption<number | null>[] = [
  { code: '0', label: '1ヶ所', value: 1 },
  { code: '2', label: '2ヶ所', value: 2 },
  { code: '3', label: '3ヶ所', value: 3 },
  { code: '4', label: '4ヶ所', value: 4 },
  { code: FREE_INPUT_CODE, label: 'フリー', value: null },
]

// --- 曲げ方 ---
// 値は spec_fields.bend_style に保存する値。二方・三方・四方は単価の追加料金の判定に使う。
// 9 フリーは「曲げ」を除いた部分（R、85° など）を右に現れる欄に文字で入力する
export type BendStyle = '90°' | '二方' | '三方' | '四方' | 'フリー'

export const BEND_STYLE_OPTIONS: readonly CodeOption<BendStyle>[] = [
  { code: '0', label: '90°', value: '90°' },
  { code: '2', label: '二方', value: '二方' },
  { code: '3', label: '三方', value: '三方' },
  { code: '4', label: '四方', value: '四方' },
  { code: FREE_INPUT_CODE, label: 'フリー', value: 'フリー' },
]

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
