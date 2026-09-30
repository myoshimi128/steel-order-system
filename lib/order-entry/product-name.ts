// 明細の品名（表示のみ）を組み立てる。
//   例: 「SN490C 電炉」「縞板 SS400 メーカーA」「ボンデ」
// 種類は初期値（番号 0 = 普通板）以外のときだけ表示する（普通板が大半のため、表示を短くする）。
// 製鋼法は入力する行（定尺売り・縞板などでない行）だけ、メーカーは指定があるときだけ表示する。

import { STEEL_MAKING_OPTIONS } from './constants'
import type { ItemMasters } from './item-types'
import type { ResolvedItem } from './resolve-item'

// 種類の初期値の番号（受注登録画面で最初から入っている種類）
const DEFAULT_PLATE_TYPE_NUMBER = 0

export function buildProductName(item: ResolvedItem, masters: ItemMasters): string {
  const parts: string[] = []

  if (item.plateType && item.plateType.number !== DEFAULT_PLATE_TYPE_NUMBER) {
    parts.push(item.plateType.name)
  }
  if (item.materialId) {
    const material = masters.materials.find((row) => row.id === item.materialId)
    if (material) {
      parts.push(material.name)
    }
  }
  if (item.steelMaking) {
    const label = STEEL_MAKING_OPTIONS.find((option) => option.value === item.steelMaking)?.label
    if (label) {
      parts.push(label)
    }
  }
  if (item.manufacturerId) {
    const manufacturer = masters.manufacturers.find((row) => row.id === item.manufacturerId)
    if (manufacturer) {
      parts.push(manufacturer.name)
    }
  }
  return parts.join(' ')
}
