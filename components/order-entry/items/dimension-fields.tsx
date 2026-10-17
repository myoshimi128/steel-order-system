'use client'

// 品名・寸法の欄: 板厚と、区分に応じた寸法の入力欄。区分に応じて寸法の欄を切り替える。
//   寸法切・アイトレ・ササラ → 板厚 × 縦 × 横（ササラは使用材の寸法）
//   ベタ丸               → 板厚 × 直径
//   ドーナツ             → 板厚 × 外径 × 内径
//   定尺                 → 板厚 × 定尺サイズ
// 区分が決まっていないときは板厚だけを表示する。
// 区分の名前は「切断・区分」の欄に出ているため、ここには出さない（docs/screen-design.md「品名・寸法の欄」）。

import type { DimensionKind } from '@/lib/order-entry/item-types'
import { CircleDimensions } from './circle-dimensions'
import type { DimensionInputProps } from './dimension-props'
import { RectangleDimensions } from './rectangle-dimensions'
import { StandardSizeDimensions } from './standard-size-dimensions'
import { ThicknessField } from './thickness-field'

type DimensionFieldsProps = DimensionInputProps & {
  kind: DimensionKind | null
}

export function DimensionFields({ kind, ...props }: DimensionFieldsProps) {
  return (
    // 間隔は 4px（gap-1）。一番長いドーナツ（板厚 × 外径 × 内径）が列の幅（196px）に収まるようにするため
    <div className="flex items-center gap-1">
      {kind === 'rectangle' && <RectangleDimensions {...props} />}
      {(kind === 'circle' || kind === 'donut') && (
        <CircleDimensions {...props} withInnerDiameter={kind === 'donut'} />
      )}
      {kind === 'plateSize' && <StandardSizeDimensions {...props} />}
      {kind === null && <ThicknessField {...props} />}
    </div>
  )
}
