// 価格系マスタの入力（種類→材質→板厚の連動プルダウン）で使う、
// 実際に登録されている商品（products）の組み合わせ一覧を取得する。
// 「登録されていない板厚を単価マスタに入力できてしまう」を防ぐため、
// 板厚は自由入力にせず、この一覧から選ばせる。

import { createClient } from '@/lib/supabase-server'

export type ProductCatalogEntry = {
  plate_type_id: string
  material_id: string | null
  thickness: number
}

export async function getProductCatalog(): Promise<ProductCatalogEntry[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('plate_type_id, material_id, thickness')
    .eq('is_active', true)

  if (!data) {
    return []
  }

  // 同じ（種類・材質・板厚）の組み合わせが形状（定尺/大板）違いで複数行になることがあるため、
  // 重複を取り除く
  const seen = new Set<string>()
  const result: ProductCatalogEntry[] = []
  for (const row of data) {
    const key = `${row.plate_type_id}|${row.material_id ?? ''}|${row.thickness}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(row)
  }
  return result
}

// thickness_extras・large_plate_extras は種類・材質の区別を持たないため、
// 種類や材質を問わず products に登録されている板厚だけを一覧で返す。
export async function getProductThicknessOptions(): Promise<number[]> {
  const catalog = await getProductCatalog()
  const thicknesses = new Set(catalog.map((entry) => entry.thickness))
  return Array.from(thicknesses).sort((a, b) => a - b)
}
