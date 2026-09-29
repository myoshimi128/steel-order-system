// 単価計算に必要な価格マスタの行を、DB の関数 get_pricing_rows から取得する。
//
// 価格マスタは admin 以外が直接参照できない（RLS）。事務ロールでも単価を計算できるよう、
// 明細 1 行分の条件に該当する行だけを返す関数（security definer）を DB に用意しており、
// ここではその関数を呼んで lib/pricing の計算関数にそのまま渡せる PricingMasters を返す。
// 計算そのもの（最新行の選択・エキストラの加算・保証重量の判定）は、
// このファイルではなく calculate-price.ts などの純粋な関数で行う。
//
// Supabase クライアントは引数で受け取る（サーバー用・ブラウザ用のどちらからでも呼べるようにし、
// テストではモックを渡せるようにするため）。

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type {
  CuttingMethod,
  CuttingType,
  PlateSize,
  PricingMasters,
} from './types'

// 明細 1 行分の条件。区分によって使わない項目は省略する
export type PricingRowConditions = {
  plateTypeId: string
  thickness: number
  // 単価の基準日（受注日）。'YYYY-MM-DD'
  asOf: string
  // 無規格（ボンデ・ミガキ）は null
  materialId?: string | null
  // 通常の切断・特殊製品で指定する（定尺売りは省略）
  cuttingMethod?: CuttingMethod | null
  cuttingType?: CuttingType | null
  // 特殊製品で指定する
  specialProductTypeId?: string | null
  // スプライスのショット加工の有無（受注単位の orders.splice_shot）
  hasShot?: boolean
  // 定尺売りで指定する
  plateSize?: PlateSize | null
}

// PricingMasters の各キー。関数の返り値にすべて配列として含まれているかの確認に使う
const MASTER_KEYS = [
  'cuttingPrices',
  'materialExtras',
  'thicknessExtras',
  'largePlateExtras',
  'specialProductPrices',
  'standardPlatePrices',
] as const satisfies readonly (keyof PricingMasters)[]

// null を undefined に変換する。
// RPC の引数は省略（undefined）すると DB 側の既定値（NULL）が使われるため、
// 「指定なし」は null ではなく省略として渡す
function omitNull<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined
}

export async function fetchPricingMasters(
  supabase: SupabaseClient<Database>,
  conditions: PricingRowConditions,
): Promise<PricingMasters> {
  const { data, error } = await supabase.rpc('get_pricing_rows', {
    p_plate_type_id: conditions.plateTypeId,
    p_thickness: conditions.thickness,
    p_as_of: conditions.asOf,
    p_material_id: omitNull(conditions.materialId),
    p_cutting_method: omitNull(conditions.cuttingMethod),
    p_cutting_type: omitNull(conditions.cuttingType),
    p_special_product_type_id: omitNull(conditions.specialProductTypeId),
    p_has_shot: conditions.hasShot ?? false,
    p_plate_size: omitNull(conditions.plateSize),
  })

  if (error) {
    throw new Error(`価格マスタの取得に失敗しました: ${error.message}`)
  }
  return toPricingMasters(data)
}

// 関数の返り値（JSON）が PricingMasters の形になっているかを確認して返す。
// 形が違う場合（関数の定義とこのファイルがずれた場合など）は、
// 誤った単価を出さないようにエラーにする。
export function toPricingMasters(data: unknown): PricingMasters {
  if (typeof data !== 'object' || data === null) {
    throw new Error('価格マスタの取得結果の形式が不正です')
  }
  const record = data as Record<string, unknown>
  for (const key of MASTER_KEYS) {
    if (!Array.isArray(record[key])) {
      throw new Error(`価格マスタの取得結果に ${key} がありません`)
    }
  }
  // 各行の列は DB の関数側で PricingMasters の型に合わせて選んでいる
  return record as unknown as PricingMasters
}
