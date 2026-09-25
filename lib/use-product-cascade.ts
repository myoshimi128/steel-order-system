'use client'

// 種類→材質→板厚の連動プルダウン用フック。
// products（lib/product-catalog.ts の getProductCatalog()）から取得した組み合わせ一覧を元に、
// 「選んだ種類（・材質）に実際に登録されている板厚だけ」を選択肢として絞り込む。
//
// useMaterialFilter が false のテーブル（special_product_prices, unit_weights）は
// material_id の列を持たないため、材質は無視して種類だけで板厚を絞り込む。
//
// 材質が空欄（''）のときの扱いは2通りある。
//   blankMeansNullMaterial: true（既定）
//     空欄 = ボンデ・ミガキのような「無規格（material_id が NULL）」を表す。
//     material_id が NULL の商品だけに絞り込む（standard_plate_prices など）。
//   blankMeansNullMaterial: false
//     空欄 = cutting_prices の「指定なし＝SS400ベース」を表す。無規格の商品という
//     意味ではないので、材質を問わず種類だけで板厚を絞り込む
//     （縞板のように material_id が NULL でない商品しかない種類でも板厚が出るように）。

import { useMemo, useState } from 'react'
import type { ProductCatalogEntry } from '@/lib/product-catalog'

export function useProductCascade(
  products: ProductCatalogEntry[],
  options: {
    useMaterialFilter: boolean
    blankMeansNullMaterial?: boolean
    initialPlateTypeId?: string
    initialMaterialId?: string | null
  }
) {
  const [plateTypeId, setPlateTypeId] = useState(
    options.initialPlateTypeId ?? ''
  )
  const [materialId, setMaterialId] = useState(
    options.initialMaterialId ?? ''
  )

  // 選んだ種類に登録がある材質の一覧（「材質なし」の商品は select の選択肢を
  // 別に用意するので、ここには含めない）
  const materialIds = useMemo(() => {
    const set = new Set<string>()
    for (const product of products) {
      if (product.plate_type_id === plateTypeId && product.material_id) {
        set.add(product.material_id)
      }
    }
    return set
  }, [products, plateTypeId])

  const blankMeansNullMaterial = options.blankMeansNullMaterial ?? true

  // 選んだ種類（材質を使うテーブルなら材質も）に登録がある板厚の一覧
  const thicknesses = useMemo(() => {
    const set = new Set<number>()
    for (const product of products) {
      if (product.plate_type_id !== plateTypeId) {
        continue
      }
      if (options.useMaterialFilter) {
        if (materialId === '') {
          // blankMeansNullMaterial が false のときは「指定なし」で材質を絞り込まない
          if (blankMeansNullMaterial && product.material_id !== null) {
            continue
          }
        } else if (product.material_id !== materialId) {
          continue
        }
      }
      set.add(product.thickness)
    }
    return Array.from(set).sort((a, b) => a - b)
  }, [products, plateTypeId, materialId, options.useMaterialFilter, blankMeansNullMaterial])

  return {
    plateTypeId,
    setPlateTypeId,
    materialId,
    setMaterialId,
    materialIds,
    thicknesses,
  }
}
