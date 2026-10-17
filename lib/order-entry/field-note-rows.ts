// ③ 伝票の指示の「摘要」の一覧に並べる行を作る（docs/screen-design.md「③ 伝票の指示」）。
// ② で入力した明細を、どの行か分かる程度の文字（切断・区分・材質・品名・寸法・数量）にする。
// 何も入力していない行は保存しないため、一覧にも出さない。画面に依存しない純粋な関数にしてテストする。

import { findCodeOption } from '@/lib/code-input/code-option'
import { PLATE_SIZE_OPTIONS } from './constants'
import { cutRegionOptions, processTypeOptions } from './item-options'
import { INITIAL_ITEM_ROW } from './item-row'
import { materialNumbers } from './item-structure'
import type { ItemContext, ItemMasters, ItemRowValues } from './item-types'
import { formatProcessSpec } from './process-shapes'
import { isBlankRow } from './resolve-item'
import type { RowCheck } from './validate-order-items'

export type FieldNoteRow = {
  key: string
  // No 欄（材料の行は行番号、加工の行は「└」）
  number: string
  isProcess: boolean
  // 切断・区分（加工の行は加工方法）。番号＋名前
  cutRegion: string
  material: string
  // 品名・寸法（加工の行は加工の項目の文）
  dimensions: string
  quantity: string
}

// 板厚と寸法を「12 × 300 × 270」のような文にする（入力されている欄だけをつなぐ）
function dimensionText(row: ItemRowValues): string {
  const plateSize = findCodeOption(PLATE_SIZE_OPTIONS, row.plateSize)?.value ?? ''
  const parts = [row.thickness, row.width, row.length, row.outerDiameter, row.innerDiameter, plateSize]
    .map((value) => value.trim())
    .filter((value) => value !== '')
  return parts.join(' × ')
}

export function fieldNoteRows(
  rows: readonly ItemRowValues[],
  checks: readonly RowCheck[],
  masters: ItemMasters,
  context: ItemContext,
): FieldNoteRow[] {
  const numbers = materialNumbers(rows)
  const cutRegions = cutRegionOptions(masters, context.isSplice)
  const processTypes = processTypeOptions(masters)

  return rows.flatMap((row, index): FieldNoteRow[] => {
    if (isBlankRow(row, INITIAL_ITEM_ROW)) {
      return []
    }
    const check = checks[index]
    if (check.kind === 'process') {
      const processType = findCodeOption(processTypes, row.processType)
      return [
        {
          key: row.key,
          number: '└',
          isProcess: true,
          cutRegion: processType ? `${processType.code} ${processType.label}` : row.processType,
          material: '',
          // 項目で入力する形は項目から文を組み立てる。自由入力は入力した文のまま
          dimensions: check.resolved.spec ? formatProcessSpec(check.resolved.spec) : row.spec,
          quantity: check.resolved.quantity?.toLocaleString('ja-JP') ?? row.quantity,
        },
      ]
    }
    const cutRegion = findCodeOption(cutRegions, row.cutRegion)
    const material = masters.materials.find((item) => item.id === check.resolved.materialId)
    return [
      {
        key: row.key,
        number: String(numbers[index] ?? ''),
        isProcess: false,
        cutRegion: cutRegion ? `${cutRegion.code} ${cutRegion.label}` : row.cutRegion,
        material: material?.name ?? '',
        dimensions: dimensionText(row),
        quantity: row.quantity,
      },
    ]
  })
}
