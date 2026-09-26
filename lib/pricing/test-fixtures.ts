// テスト用のマスタデータ。
// supabase/seed/002_pricing_initial_data.sql の値のうち、テストで使う行だけを抜き出している。
// ID は実際の uuid の代わりに、読みやすい文字列を使う。

import type {
  CuttingPriceRow,
  PlateTypeRow,
  PricingMasters,
  SpecialProductTypeRow,
} from './types'

// --- plate_types ---
export const NORMAL_PLATE: PlateTypeRow = { id: 'plate-normal', applies_material_extra: true }
export const CHECKERED_PLATE: PlateTypeRow = { id: 'plate-checkered', applies_material_extra: false }
export const BONDE_PLATE: PlateTypeRow = { id: 'plate-bonde', applies_material_extra: false }

// --- materials ---
export const SS400 = 'mat-ss400'
export const SN400B = 'mat-sn400b'
export const SM400A = 'mat-sm400a'
export const TMCP385C = 'mat-tmcp385c'

// --- special_product_types ---
export const SPLICE: SpecialProductTypeRow = {
  id: 'sp-splice',
  weight_basis: '角重量',
  min_weight: 3,
  applies_thickness_extra: false,
  applies_large_plate_extra: false,
  always_piece_price: false,
  has_light_tier: false,
  irregular_cut_quote_required: true,
}
export const SASARA: SpecialProductTypeRow = {
  id: 'sp-sasara',
  weight_basis: '使用材重量',
  min_weight: null,
  applies_thickness_extra: false,
  applies_large_plate_extra: false,
  always_piece_price: false,
  has_light_tier: false,
  irregular_cut_quote_required: false,
}
export const BETAMARU: SpecialProductTypeRow = {
  id: 'sp-betamaru',
  weight_basis: '角重量',
  min_weight: null,
  applies_thickness_extra: true,
  applies_large_plate_extra: true,
  always_piece_price: true,
  has_light_tier: true,
  irregular_cut_quote_required: false,
}

// 切断単価の行を短く書くためのヘルパー（フラグは指定がなければ false）
function cuttingRow(
  row: Omit<CuttingPriceRow, 'valid_from' | 'has_light_tier' | 'small_piece_quote_required'> &
    Partial<Pick<CuttingPriceRow, 'valid_from' | 'has_light_tier' | 'small_piece_quote_required'>>,
): CuttingPriceRow {
  return {
    valid_from: '2026-05-21',
    has_light_tier: false,
    small_piece_quote_required: false,
    ...row,
  }
}

export const MASTERS: PricingMasters = {
  cuttingPrices: [
    // 普通板・SS400ベース: レーザー寸法切（1.5kg の段あり）
    cuttingRow({
      plate_type_id: NORMAL_PLATE.id,
      material_id: null,
      thickness_min: 3.2,
      thickness_max: 12,
      cutting_method: 'レーザー',
      cutting_type: '寸法切',
      unit_price: 170,
      has_light_tier: true,
    }),
    cuttingRow({
      plate_type_id: NORMAL_PLATE.id,
      material_id: null,
      thickness_min: 14,
      thickness_max: 25,
      cutting_method: 'レーザー',
      cutting_type: '寸法切',
      unit_price: 185,
      has_light_tier: true,
    }),
    // 普通板・SS400ベース: ガス寸法切
    cuttingRow({
      plate_type_id: NORMAL_PLATE.id,
      material_id: null,
      thickness_min: 14,
      thickness_max: 25,
      cutting_method: 'ガス',
      cutting_type: '寸法切',
      unit_price: 175,
    }),
    cuttingRow({
      plate_type_id: NORMAL_PLATE.id,
      material_id: null,
      thickness_min: 28,
      thickness_max: 50,
      cutting_method: 'ガス',
      cutting_type: '寸法切',
      unit_price: 175,
      small_piece_quote_required: true,
    }),
    // 普通板・SM400A（専用単価）: レーザー寸法切
    cuttingRow({
      plate_type_id: NORMAL_PLATE.id,
      material_id: SM400A,
      thickness_min: 12,
      thickness_max: 19,
      cutting_method: 'レーザー',
      cutting_type: '寸法切',
      unit_price: 178.5,
    }),
    // 普通板・TMCP385C（専用単価）: ガス寸法切
    cuttingRow({
      plate_type_id: NORMAL_PLATE.id,
      material_id: TMCP385C,
      thickness_min: 36,
      thickness_max: 50,
      cutting_method: 'ガス',
      cutting_type: '寸法切',
      unit_price: 280,
    }),
    // ボンデ: シャー寸法切
    cuttingRow({
      plate_type_id: BONDE_PLATE.id,
      material_id: null,
      thickness_min: 1.6,
      thickness_max: 2.3,
      cutting_method: 'シャーリング',
      cutting_type: '寸法切',
      unit_price: 240,
    }),
  ],
  materialExtras: [
    { material_id: SS400, extra_price: 0, blast_furnace_extra: 0 },
    { material_id: SN400B, extra_price: 10, blast_furnace_extra: 10 },
    { material_id: SM400A, extra_price: 0, blast_furnace_extra: 10 },
    { material_id: TMCP385C, extra_price: 0, blast_furnace_extra: 10 },
  ],
  thicknessExtras: [
    { thickness: 28, extra_price: 1 },
    { thickness: 32, extra_price: 2 },
    { thickness: 36, extra_price: 3 },
    { thickness: 40, extra_price: 4 },
    { thickness: 45, extra_price: 5 },
    { thickness: 50, extra_price: 6 },
  ],
  largePlateExtras: [
    { thickness: 3.2, extra_price: 30 },
    { thickness: 4.5, extra_price: 30 },
    { thickness: 6, extra_price: 30 },
    { thickness: 9, extra_price: 15 },
    { thickness: 12, extra_price: 15 },
  ],
  specialProductPrices: [
    // スプライス（普通板）
    { special_product_type_id: SPLICE.id, plate_type_id: NORMAL_PLATE.id, has_shot: false, thickness_min: 1.6, thickness_max: 25, unit_price: 180, valid_from: '2026-05-21' },
    { special_product_type_id: SPLICE.id, plate_type_id: NORMAL_PLATE.id, has_shot: true, thickness_min: 1.6, thickness_max: 25, unit_price: 190, valid_from: '2026-05-21' },
    // ササラ（普通板）
    { special_product_type_id: SASARA.id, plate_type_id: NORMAL_PLATE.id, has_shot: false, thickness_min: 1.6, thickness_max: 12, unit_price: 200, valid_from: '2026-05-21' },
    // ベタ丸（普通板）
    { special_product_type_id: BETAMARU.id, plate_type_id: NORMAL_PLATE.id, has_shot: false, thickness_min: 2.3, thickness_max: 2.3, unit_price: 235, valid_from: '2026-05-21' },
    { special_product_type_id: BETAMARU.id, plate_type_id: NORMAL_PLATE.id, has_shot: false, thickness_min: 3.2, thickness_max: 12, unit_price: 190, valid_from: '2026-05-21' },
    { special_product_type_id: BETAMARU.id, plate_type_id: NORMAL_PLATE.id, has_shot: false, thickness_min: 28, thickness_max: 36, unit_price: 200, valid_from: '2026-05-21' },
    // ベタ丸（縞板）
    { special_product_type_id: BETAMARU.id, plate_type_id: CHECKERED_PLATE.id, has_shot: false, thickness_min: 3.2, thickness_max: 12, unit_price: 235, valid_from: '2026-05-21' },
  ],
  standardPlatePrices: [
    // 普通板・SS400
    { plate_type_id: NORMAL_PLATE.id, material_id: SS400, thickness: 6, plate_size: '5x10', unit_price: 121, valid_from: '2026-05-21' },
    // 縞板・SS400
    { plate_type_id: CHECKERED_PLATE.id, material_id: SS400, thickness: 3.2, plate_size: '4x8', unit_price: 155, valid_from: '2026-05-21' },
    // ボンデ（無規格のため material_id は NULL）
    { plate_type_id: BONDE_PLATE.id, material_id: null, thickness: 1.6, plate_size: '3x6', unit_price: 170, valid_from: '2026-05-21' },
  ],
}
