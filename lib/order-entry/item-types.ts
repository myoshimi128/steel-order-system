// 受注明細（材料の行）で使う型の定義。

import type { CuttingType, SpecialProductTypeRow } from '@/lib/pricing/types'

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
}

// --- 明細の行の入力値 ---

// 各欄の入力値（番号の欄は打った番号、数値の欄は打った文字をそのまま持つ）
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
  quantity: string
  // 摘要（order_items.field_note）
  fieldNote: string
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
  // 加工の行（次の作業で実装）
  | { kind: 'process' }
  // 特殊製品（ササラ・ベタ丸・ドーナツ）
  | { kind: 'special'; type: SpecialProductTypeMaster }

// 寸法の入力欄の種類
export type DimensionKind = 'rectangle' | 'circle' | 'donut' | 'plateSize'
