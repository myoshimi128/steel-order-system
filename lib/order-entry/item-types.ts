// 受注明細（材料の行）で使う型の定義。

import type { CuttingType, SpecialProductTypeRow } from '@/lib/pricing/types'
import type { ProcessInputShape } from './constants'

// --- 明細の入力に使うマスタ（page.tsx でサーバーから取得して渡す） ---

export type PlateTypeMaster = {
  id: string
  number: number
  name: string
  applies_material_extra: boolean
}

export type MaterialMaster = {
  id: string
  number: number
  name: string
  // 材質を選んだときに入れる製鋼法の初期値
  default_steel_making: '電炉材' | '高炉材'
}

export type ProductMaster = {
  id: string
  plate_type_id: string
  // 無規格（ボンデ・ミガキ）は NULL
  material_id: string | null
  thickness: number
  shape: '定尺' | '大板'
}

export type ManufacturerMaster = {
  id: string
  code: string
  name: string
}

export type UnitWeightMaster = {
  plate_type_id: string
  manufacturer_id: string
  thickness: number
  unit_weight: number
}

// 単価計算に使う列（SpecialProductTypeRow）に、画面で使う列を足したもの
export type SpecialProductTypeMaster = SpecialProductTypeRow & {
  number: number
  name: string
  is_splice_order_type: boolean
  // 寸法の形（角: 縦×横 / 円: 直径 / ドーナツ: 外径×内径）
  dimension_shape: '角' | '円' | 'ドーナツ'
}

export type ItemMasters = {
  plateTypes: readonly PlateTypeMaster[]
  materials: readonly MaterialMaster[]
  products: readonly ProductMaster[]
  manufacturers: readonly ManufacturerMaster[]
  unitWeights: readonly UnitWeightMaster[]
  specialProductTypes: readonly SpecialProductTypeMaster[]
  processTypes: readonly ProcessTypeMaster[]
}

export type ProcessTypeMaster = {
  id: string
  // 番号が未設定の加工種別は、受注登録画面では選べない
  number: number | null
  name: string
  // 入力の形（加工の項目の入力欄と、数量の求め方を決める）
  input_shape: ProcessInputShape
}

// --- 明細の行の入力値 ---

// 各欄の入力値（番号の欄は打った番号、数値の欄は打った文字をそのまま持つ）。
// 材料の行と加工の行を同じ形で持ち、区分が「9 加工」の行を加工の行として扱う。
// 加工の行は、それより上にあるいちばん近い材料の行にぶら下がる（item-structure.ts）。
export type ItemRowValues = {
  // 行を見分けるための ID（画面の中だけで使う。保存はしない）
  key: string
  cuttingMethod: string
  region: string
  plateType: string
  material: string
  steelMaking: string
  manufacturer: string
  thickness: string
  // 縦・横（寸法切・アイトレ・ササラの使用材の寸法）
  width: string
  length: string
  // 直径・外径（ベタ丸・ドーナツ）と内径（ドーナツ）
  outerDiameter: string
  innerDiameter: string
  // 定尺サイズの番号
  plateSize: string
  // 数量（材料の行は枚数、加工の行は加工数量）
  quantity: string
  // 摘要（材料の行は order_items.field_note、加工の行は order_item_processes.remarks）
  fieldNote: string
  // --- 加工の行だけで使う欄 ---
  // 加工方法（加工種別マスタの番号）
  processType: string
  // 加工内容（自由入力の形の加工だけで使う。例: 1S/ 2孔 30X12φ）
  spec: string
  // --- 加工の項目（入力の形が「穴」の加工） ---
  // 1 枚あたりの孔数
  holesPerPiece: string
  // 穴径（mm）
  holeDiameter: string
  // --- 加工の項目（入力の形が「曲げ」の加工） ---
  // ヶ所の番号（0 1ヶ所 / 2〜4 / 9 フリー）と、9 フリーのときに入力するヶ所数
  bendCount: string
  bendCountFree: string
  // 曲げ方の番号（0 90° / 2 二方 / 3 三方 / 4 四方 / 9 フリー）と、9 フリーのときに入力する文字
  // （「曲げ」を除いた部分。R、85° など）
  bendStyle: string
  bendStyleFree: string
  // 単位の番号（1 個 / 2 kg）
  priceUnit: string
  // 加工の仕入単価（手入力。空欄は単価未定）
  unitPrice: string
}

export type ItemFieldName = Exclude<keyof ItemRowValues, 'key'>

// 行ごとのエラー（キーは欄の名前）
export type ItemErrors = Partial<Record<ItemFieldName, string>>

// --- 区分を解釈した結果 ---

export type Region =
  // 寸法切・アイトレ（通常の切断）
  | { kind: 'cut'; cuttingType: CuttingType }
  // 定尺売り
  | { kind: 'standard' }
  // 加工の行
  | { kind: 'process' }
  // 特殊製品（ササラ・ベタ丸・ドーナツ、スプライス専用の受注ではスプライス）。
  // cuttingType はスプライス専用の受注の切断区分（寸法切 / アイトレ）。それ以外の特殊製品は null
  | { kind: 'special'; type: SpecialProductTypeMaster; cuttingType: CuttingType | null }

// 受注全体の設定のうち、明細の解釈・計算に使うもの（ヘッダーの値）
export type ItemContext = {
  // スプライス専用の受注か
  isSplice: boolean
  // スプライス専用の受注のショット加工の有無（未選択は null）
  spliceShot: boolean | null
}

// 寸法の入力欄の種類
export type DimensionKind = 'rectangle' | 'circle' | 'donut' | 'plateSize'
