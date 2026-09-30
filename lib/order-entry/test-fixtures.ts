// 明細のテストで使うマスタ。
// ID と単価は lib/pricing/test-fixtures.ts（seed 002 の抜粋）と合わせている。

import { BETAMARU, SASARA, SPLICE } from '@/lib/pricing/test-fixtures'
import type { ItemMasters, ItemRowValues } from './item-types'
import { EMPTY_ITEM_VALUES } from './item-row'

export const ITEM_MASTERS: ItemMasters = {
  plateTypes: [
    { id: 'plate-normal', number: 0, name: '普通板', applies_material_extra: true },
    { id: 'plate-checkered', number: 1, name: '縞板', applies_material_extra: false },
    { id: 'plate-bonde', number: 2, name: 'ボンデ', applies_material_extra: false },
  ],
  materials: [
    // SS400 は「0（いつもの値）」。製鋼法の初期値は SS400 が電炉材、それ以外は高炉材
    { id: 'mat-ss400', number: 0, name: 'SS400', default_steel_making: '電炉材' },
    { id: 'mat-sm400a', number: 3, name: 'SM400A', default_steel_making: '高炉材' },
    { id: 'mat-sn400b', number: 4, name: 'SN400B', default_steel_making: '高炉材' },
  ],
  products: [
    // 普通板 SS400: 9mm は定尺・大板の両方、28mm は大板のみ
    { id: 'p-ss400-9-std', plate_type_id: 'plate-normal', material_id: 'mat-ss400', thickness: 9, shape: '定尺' },
    { id: 'p-ss400-9-large', plate_type_id: 'plate-normal', material_id: 'mat-ss400', thickness: 9, shape: '大板' },
    { id: 'p-ss400-6-std', plate_type_id: 'plate-normal', material_id: 'mat-ss400', thickness: 6, shape: '定尺' },
    { id: 'p-ss400-28-large', plate_type_id: 'plate-normal', material_id: 'mat-ss400', thickness: 28, shape: '大板' },
    // 普通板 SN400B 9mm 定尺のみ
    { id: 'p-sn400b-9-std', plate_type_id: 'plate-normal', material_id: 'mat-sn400b', thickness: 9, shape: '定尺' },
    // 縞板 SS400 3.2mm 定尺
    { id: 'p-check-3.2-std', plate_type_id: 'plate-checkered', material_id: 'mat-ss400', thickness: 3.2, shape: '定尺' },
    // ボンデ（材質なし）1.6mm 定尺
    { id: 'p-bonde-1.6-std', plate_type_id: 'plate-bonde', material_id: null, thickness: 1.6, shape: '定尺' },
  ],
  manufacturers: [
    { id: 'maker-a', code: '1', name: 'メーカーA' },
    { id: 'maker-b', code: '2', name: 'メーカーB' },
  ],
  unitWeights: [
    // 縞板の単位質量: メーカーA は 3.2mm、メーカーB は 4.5mm だけ登録されている
    // （メーカーB は縞板の選択肢には出るが、3.2mm の単位質量はない）
    { plate_type_id: 'plate-checkered', manufacturer_id: 'maker-a', thickness: 3.2, unit_weight: 26.82 },
    { plate_type_id: 'plate-checkered', manufacturer_id: 'maker-b', thickness: 4.5, unit_weight: 36.99 },
  ],
  specialProductTypes: [
    { ...SPLICE, number: 4, name: 'スプライス', is_splice_order_type: true, dimension_shape: '角' },
    { ...SASARA, number: 5, name: 'ササラ', is_splice_order_type: false, dimension_shape: '角' },
    { ...BETAMARU, number: 7, name: 'ベタ丸', is_splice_order_type: false, dimension_shape: '円' },
  ],
}

// 入力値の一部だけを指定して行を作る（ほかの欄は空の行の初期値）
export function itemRow(values: Partial<ItemRowValues>): ItemRowValues {
  return { key: 'row-1', ...EMPTY_ITEM_VALUES, ...values }
}
