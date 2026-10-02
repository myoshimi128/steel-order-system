// 受注登録画面で使うマスタを、サーバー（Server Component / Server Action）で取得する。
//
// 画面の表示（page.tsx）と保存時の確認（actions.ts）の両方で同じマスタを使うため、ここにまとめる。
// 価格マスタ（単価）はここでは取得しない。価格マスタは事務ロールが一覧を参照できないため、
// 明細ごとに get_pricing_rows で必要な行だけを取得する（lib/pricing/fetch-pricing-masters.ts）。

import type { SupabaseClient } from '@supabase/supabase-js'
import { sortByCode, type CodeOption } from '@/lib/code-input/code-option'
import type { Database } from '@/lib/database.types'
import { SAME_AS_CUSTOMER_OPTION } from './constants'
import type { ItemMasters, ProcessTypeMaster, SpecialProductTypeMaster } from './item-types'
import type { HeaderMasterOptions } from './use-order-header'

export type OrderEntryMasters = {
  header: HeaderMasterOptions
  items: ItemMasters
}

// 得意先・納入先の行を、番号入力の選択肢（番号＝コード、名称、保存する値＝id）に変換する。
// ふりがなは一覧の検索に使う（未登録なら名前だけで検索する）
function toCodedMasterOption(row: {
  id: string
  code: string
  name: string
  name_kana: string | null
}): CodeOption<string> {
  return { code: row.code, label: row.name, value: row.id, kana: row.name_kana ?? undefined }
}

// Supabase の select の結果を配列にする。取得に失敗した場合は画面を出せないため例外にする
function rowsOf<T>(result: { data: T[] | null; error: { message: string } | null }, label: string): T[] {
  if (result.error) {
    throw new Error(`${label}の取得に失敗しました: ${result.error.message}`)
  }
  return result.data ?? []
}

export async function loadOrderEntryMasters(
  supabase: SupabaseClient<Database>,
): Promise<OrderEntryMasters> {
  const [
    customers,
    destinations,
    deliveryMethods,
    plateTypes,
    materials,
    products,
    manufacturers,
    unitWeights,
    specialProductTypes,
    processTypes,
  ] = await Promise.all([
    supabase.from('customers').select('id, code, name, name_kana').eq('is_active', true),
    supabase.from('delivery_destinations').select('id, code, name, name_kana').eq('is_active', true),
    supabase.from('delivery_methods').select('id, number, name, requires_note').eq('is_active', true),
    supabase.from('plate_types').select('id, number, name, applies_material_extra').eq('is_active', true),
    supabase
      .from('materials')
      .select('id, number, name, default_steel_making')
      .eq('is_active', true),
    supabase
      .from('products')
      .select('id, plate_type_id, material_id, thickness, shape')
      .eq('is_active', true),
    supabase.from('manufacturers').select('id, code, name').eq('is_active', true),
    supabase
      .from('unit_weights')
      .select('plate_type_id, manufacturer_id, thickness, unit_weight')
      .eq('is_active', true),
    supabase
      .from('special_product_types')
      .select(
        'id, number, name, weight_basis, min_weight, applies_thickness_extra, applies_large_plate_extra, always_piece_price, has_light_tier, irregular_cut_quote_required, is_splice_order_type, dimension_shape',
      )
      .eq('is_active', true),
    // 加工方法（加工の行）。番号が未設定の行は画面の選択肢から外す（item-options.ts）
    // 入力の形（input_shape）で、加工の項目の入力欄と数量の求め方を切り替える
    supabase.from('process_types').select('id, number, name, input_shape').eq('is_active', true),
  ])

  const deliveryMethodRows = rowsOf(deliveryMethods, '配達方法')

  return {
    header: {
      customers: sortByCode(rowsOf(customers, '得意先').map(toCodedMasterOption)),
      // 入れ先は先頭に「0 売り先と同じ」（初期値）を置き、その後に納入先マスタの行を並べる
      destinations: [
        SAME_AS_CUSTOMER_OPTION,
        ...sortByCode(rowsOf(destinations, '納入先').map(toCodedMasterOption)),
      ],
      deliveryMethods: sortByCode(
        deliveryMethodRows.map(
          (row): CodeOption<string> => ({ code: String(row.number), label: row.name, value: row.id }),
        ),
      ),
      deliveryMethodIdsRequiringNote: deliveryMethodRows
        .filter((row) => row.requires_note)
        .map((row) => row.id),
    },
    items: {
      plateTypes: rowsOf(plateTypes, '種類'),
      // default_steel_making は DB 上 text 列（CHECK 制約で '電炉材' / '高炉材' に限定）のため、型だけ合わせる
      materials: rowsOf(materials, '材質').map((row) => ({
        ...row,
        default_steel_making: row.default_steel_making as '電炉材' | '高炉材',
      })),
      // shape は DB 上 text 列（CHECK 制約で '定尺' / '大板' に限定）のため、型だけ合わせる
      products: rowsOf(products, '商品').map((row) => ({
        ...row,
        shape: row.shape as '定尺' | '大板',
      })),
      manufacturers: rowsOf(manufacturers, 'メーカー'),
      unitWeights: rowsOf(unitWeights, '単位質量'),
      // dimension_shape も CHECK 制約で 3 値に限定されている
      specialProductTypes: rowsOf(specialProductTypes, '特殊製品種別').map(
        (row): SpecialProductTypeMaster => ({
          ...row,
          dimension_shape: row.dimension_shape as SpecialProductTypeMaster['dimension_shape'],
        }),
      ),
      // input_shape も CHECK 制約で入力の形の値に限定されている
      processTypes: rowsOf(processTypes, '加工種別').map(
        (row): ProcessTypeMaster => ({
          ...row,
          input_shape: row.input_shape as ProcessTypeMaster['input_shape'],
        }),
      ),
    },
  }
}
