// 重量・単価計算で使う型の定義。
//
// 計算ロジックは画面や Supabase から切り離した純粋な関数にしているため、
// マスタの行は「計算に必要な列だけ」を持つ型として定義する。
// Supabase から取得した行（lib/database.types.ts の Row 型）は、これらの列を含んでいれば
// そのまま渡せる（TypeScript は余分な列があっても構造が合えば受け付ける）。

export type SteelMaking = '電炉材' | '高炉材'
export type CuttingMethod = 'シャーリング' | 'ガス' | 'レーザー' | 'プラズマ'
export type CuttingType = '寸法切' | 'アイトレ'
export type Shape = '定尺' | '大板'
export type WeightBasis = '実重量' | '角重量' | '使用材重量'
export type PlateSize = '3x6' | '4x8' | '5x10'

// ------------------------------------------------------------
// マスタの行
// ------------------------------------------------------------

// plate_types（種類）
export type PlateTypeRow = {
  id: string
  // 材質エキストラを適用するか（普通板のみ true）
  applies_material_extra: boolean
}

// cutting_prices（切断単価）
export type CuttingPriceRow = {
  plate_type_id: string
  // NULL は SS400 ベースの共通単価
  material_id: string | null
  thickness_min: number
  thickness_max: number
  cutting_method: string
  cutting_type: string
  // NULL は別途見積もり
  unit_price: number | null
  // 適用開始日（'YYYY-MM-DD'）
  valid_from: string
  // 1.5kg の段があるか
  has_light_tier: boolean
  // 1枚 2kg 未満は別途見積もりか
  small_piece_quote_required: boolean
}

// material_extras（材質エキストラ・高炉材加算）
export type MaterialExtraRow = {
  material_id: string
  extra_price: number
  blast_furnace_extra: number
}

// thickness_extras（板厚エキストラ）/ large_plate_extras（大板加算）は同じ形
export type ThicknessExtraRow = {
  thickness: number
  extra_price: number
}

// special_product_types（特殊製品種別）
export type SpecialProductTypeRow = {
  id: string
  weight_basis: string
  // 最低保証重量（スプライスは 3。他は NULL）
  min_weight: number | null
  applies_thickness_extra: boolean
  applies_large_plate_extra: boolean
  // 常に枚単価で表示するか（ベタ丸・ドーナツ）
  always_piece_price: boolean
  // 1.5kg の段があるか（ベタ丸・ドーナツ）
  has_light_tier: boolean
  // 切断区分がアイトレの場合に別途見積もりとするか（スプライス）
  irregular_cut_quote_required: boolean
}

// special_product_prices（特殊製品単価）
export type SpecialProductPriceRow = {
  special_product_type_id: string
  plate_type_id: string
  has_shot: boolean
  thickness_min: number
  thickness_max: number
  unit_price: number
  valid_from: string
}

// standard_plate_prices（定尺単価）
export type StandardPlatePriceRow = {
  plate_type_id: string
  // 無規格（ボンデ・ミガキ）は NULL
  material_id: string | null
  thickness: number
  plate_size: string
  unit_price: number
  valid_from: string
}

// 単価計算に使うマスタ一式。呼び出し側で Supabase から取得して渡す。
export type PricingMasters = {
  cuttingPrices: CuttingPriceRow[]
  materialExtras: MaterialExtraRow[]
  thicknessExtras: ThicknessExtraRow[]
  largePlateExtras: ThicknessExtraRow[]
  specialProductPrices: SpecialProductPriceRow[]
  standardPlatePrices: StandardPlatePriceRow[]
}

// ------------------------------------------------------------
// 計算結果
// ------------------------------------------------------------

// 最低保証重量の決まり方（どの段があるか）。
// 切断単価の行・特殊製品種別のフラグから組み立てる。
export type MinimumWeightRule = {
  // 1.5kg の段があるか
  hasLightTier: boolean
  // 独自の最低保証重量（スプライスの 3kg）。NULL なら 1.5kg / 2kg の段に従う
  minWeight: number | null
  // 1枚 2kg 未満は別途見積もりか
  smallPieceQuoteRequired: boolean
  // 常に枚単価で表示するか（ベタ丸・ドーナツ）
  alwaysPiecePrice: boolean
}

// kg単価の内訳。画面で「なぜこの単価になったか」を示すために返す。
export type KgUnitPriceBreakdown = {
  basePrice: number
  materialExtra: number
  blastFurnaceExtra: number
  thicknessExtra: number
  largePlateExtra: number
  // 材質指定（専用単価）の行を使ったか
  usedDedicatedPrice: boolean
}

// kg単価の計算結果。単価を決められない場合は「別途見積もり」として理由を返す。
export type KgUnitPriceResult =
  | {
      status: 'priced'
      kgUnitPrice: number
      rule: MinimumWeightRule
      breakdown: KgUnitPriceBreakdown
    }
  | { status: 'quote'; reason: string }

// 最終的な単価（保証重量・枚単価の判定後）。
export type PriceResult =
  | {
      status: 'priced'
      // エキストラをすべて加算した kg単価
      kgUnitPrice: number
      // 単価の表示単位（order_items.price_unit）
      priceUnit: 'kg' | '枚'
      // priceUnit が kg なら kg単価、枚 なら枚単価
      unitPrice: number
      // 単価の根拠にした1枚あたりの重量（保証重量、または実際の重量）
      billingWeight: number
      breakdown: KgUnitPriceBreakdown
    }
  | { status: 'quote'; reason: string }
