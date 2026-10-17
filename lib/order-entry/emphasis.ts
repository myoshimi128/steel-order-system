// 明細の行で、初期値と違う値の欄を強調するかの判定（docs/screen-design.md「初期値と違う値の強調」）。
//
// 高炉の指定・メーカー指定・縞板などは見落としやすいため、太字と色で目立たせる。
//   種類    : 0 普通板以外（縞板・ボンデ・ミガキ）
//   材質    : 0 SS400 以外
//   製鋼法  : その材質の初期値（materials.default_steel_making）と違う
//             （例: SN490C を電炉にしたとき。SN490C を高炉のままにしたときは強調しない）
//   メーカー: 0 指定なし以外
// 番号 0 が「いつもの値（初期値）」であることを使い、種類や材質の名前では分岐しない。

import type { ItemMasters } from './item-types'
import type { ResolvedItem } from './resolve-item'

export type RowEmphasis = {
  plateType: boolean
  material: boolean
  steelMaking: boolean
  manufacturer: boolean
}

export function rowEmphasis(resolved: ResolvedItem, masters: ItemMasters): RowEmphasis {
  const material = masters.materials.find((row) => row.id === resolved.materialId) ?? null
  return {
    plateType: resolved.plateType !== null && resolved.plateType.number !== 0,
    material: material !== null && material.number !== 0,
    steelMaking:
      resolved.steelMakingApplicable &&
      resolved.steelMaking !== null &&
      material !== null &&
      resolved.steelMaking !== material.default_steel_making,
    manufacturer: resolved.manufacturerId !== null,
  }
}
