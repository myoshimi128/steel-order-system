// 受注明細（材料の行）の入力内容の確認。
//
// 画面とサーバー（Server Action）の両方で同じ確認をするため、画面や DB に依存しない純粋な関数にしている。
// 確認には 2 種類ある。
//   ・入力中から出す警告（liveErrors）: 取り扱いのない板厚、単位質量のないメーカー など。
//     入力した値そのものが誤っているため、その場で気づけるようにする
//   ・保存時の確認（errors）: 上記に加えて、未入力の必須項目など

import { isBlankRow, hasAnyProduct, resolveItemRow, type ResolvedItem } from './resolve-item'
import type { ItemErrors, ItemMasters, ItemRowValues } from './item-types'

export type ItemRowCheck = {
  resolved: ResolvedItem
  // 保存時に出すエラー（入力中の警告も含む）
  errors: ItemErrors
  // 入力中から出す警告
  liveErrors: ItemErrors
}

export function checkItemRow(row: ItemRowValues, masters: ItemMasters): ItemRowCheck {
  const resolved = resolveItemRow(row, masters)
  const errors: ItemErrors = {}
  const liveErrors: ItemErrors = {}

  // 番号の欄の確認。
  //   空欄 → 保存時に「選択してください」
  //   選択肢にない番号 → 入力中から「存在しない番号です」（明細の番号は 1〜2 桁のため、打つ途中で点滅しない）
  // エラーがあれば true を返す
  function checkCode(field: keyof ItemErrors, found: boolean, label: string): boolean {
    const value = row[field]
    if (!value.trim()) {
      errors[field] = `${label}を選択してください`
      return true
    }
    if (!found) {
      liveErrors[field] = '存在しない番号です'
      return true
    }
    return false
  }

  // --- 切断方法・区分 ---
  checkCode('cuttingMethod', resolved.cuttingMethod !== null, '切断方法')
  if (checkCode('region', resolved.region !== null, '区分')) {
    // 区分のエラーはここまで
  } else if (resolved.region?.kind === 'process') {
    liveErrors.region = '加工の行は次の作業で対応します'
  } else if (resolved.cuttingMethod === '定尺' && resolved.region?.kind !== 'standard') {
    // 画面では切断方法を定尺にすると区分も定尺に固定されるが、念のため確認する
    errors.region = '切断方法が定尺のときは、区分も定尺にしてください'
  } else if (resolved.region?.kind === 'standard' && resolved.cuttingMethod !== null && resolved.cuttingMethod !== '定尺') {
    errors.region = '定尺売りは、切断方法を 9 定尺にしてください'
  }

  // --- 種類・材質・製鋼法 ---
  checkCode('plateType', resolved.plateType !== null, '種類')
  if (resolved.needsMaterial) {
    checkCode('material', resolved.materialId !== null, '材質')
  }
  if (resolved.steelMakingApplicable) {
    checkCode('steelMaking', resolved.steelMaking !== null, '製鋼法')
  }

  // --- メーカー ---
  if (row.manufacturer.trim() && !resolved.manufacturerValid) {
    liveErrors.manufacturer = '存在しない番号です'
  } else if (resolved.needsManufacturer && !resolved.manufacturerId) {
    // 縞板は単位質量がメーカーによって異なり、重量の計算に必要なため必須
    errors.manufacturer = `${resolved.plateType?.name ?? ''}はメーカーを選択してください`
  } else if (
    resolved.needsManufacturer &&
    resolved.thickness !== null &&
    resolved.unitWeight === null
  ) {
    // メーカーと板厚のどちらかが変わったら、その組み合わせに単位質量があるかを確認する
    liveErrors.manufacturer = `このメーカーには ${resolved.thickness}mm の単位質量が登録されていません`
  }

  // --- 板厚（取り扱いのない板厚の警告） ---
  if (!row.thickness.trim()) {
    errors.thickness = '板厚を入力してください'
  } else if (resolved.thickness === null) {
    liveErrors.thickness = '板厚は正の数で入力してください'
  } else if (resolved.plateType && (!resolved.needsMaterial || resolved.materialId)) {
    const exists = hasAnyProduct({
      products: masters.products,
      plateTypeId: resolved.plateType.id,
      materialId: resolved.materialId,
      thickness: resolved.thickness,
    })
    if (!exists || (resolved.productSelection && !resolved.productSelection.ok)) {
      liveErrors.thickness = exists
        ? `${resolved.thickness}mm は定尺を超える大きさ（大板）の取り扱いがありません`
        : `${resolved.thickness}mm は取り扱いがありません。商品マスタに追加してから登録してください`
    }
  }

  // --- 寸法（区分によって入力する欄が変わる） ---
  const needPositive = (value: string, field: keyof ItemErrors, label: string) => {
    if (!value.trim()) {
      errors[field] = `${label}を入力してください`
    } else if (!/^\d+(\.\d+)?$/.test(value.trim()) || Number(value) <= 0) {
      liveErrors[field] = `${label}は正の数で入力してください`
    }
  }
  switch (resolved.dimensionKind) {
    case 'rectangle':
      needPositive(row.width, 'width', '縦')
      needPositive(row.length, 'length', '横')
      break
    case 'circle':
      needPositive(row.outerDiameter, 'outerDiameter', '直径')
      break
    case 'donut':
      needPositive(row.outerDiameter, 'outerDiameter', '外径')
      needPositive(row.innerDiameter, 'innerDiameter', '内径')
      if (
        resolved.dimensions.outerDiameter !== null &&
        resolved.dimensions.innerDiameter !== null &&
        resolved.dimensions.innerDiameter >= resolved.dimensions.outerDiameter
      ) {
        liveErrors.innerDiameter = '内径は外径より小さくしてください'
      }
      break
    case 'plateSize':
      checkCode('plateSize', resolved.plateSize !== null, '定尺サイズ')
      break
  }

  // --- 数量 ---
  if (!row.quantity.trim()) {
    errors.quantity = '数量を入力してください'
  } else if (resolved.quantity === null) {
    liveErrors.quantity = '数量は 1 以上の整数で入力してください'
  }

  return { resolved, errors: { ...errors, ...liveErrors }, liveErrors }
}

export type OrderItemsValidation = {
  // 行の key ごとのエラー（エラーのない行は含めない）
  rowErrors: Record<string, ItemErrors>
  // 明細全体のエラー（明細が 1 行もない など）
  itemsError?: string
  // 保存の対象になる行（何も入力していない行を除いたもの）
  targetRows: ItemRowValues[]
}

// 明細全体の確認。何も入力していない行は保存しないため、確認の対象から外す
export function validateOrderItems(
  rows: readonly ItemRowValues[],
  masters: ItemMasters,
  initialRow: ItemRowValues,
): OrderItemsValidation {
  const targetRows = rows.filter((row) => !isBlankRow(row, initialRow))
  const rowErrors: Record<string, ItemErrors> = {}
  for (const row of targetRows) {
    const { errors } = checkItemRow(row, masters)
    if (Object.keys(errors).length > 0) {
      rowErrors[row.key] = errors
    }
  }
  return {
    rowErrors,
    itemsError: targetRows.length === 0 ? '明細を 1 行以上入力してください' : undefined,
    targetRows,
  }
}

// 明細にエラーが 1 つでもあるか
export function hasItemErrors(validation: OrderItemsValidation): boolean {
  return validation.itemsError !== undefined || Object.keys(validation.rowErrors).length > 0
}
