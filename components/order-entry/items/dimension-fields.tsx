'use client'

// 品名の欄の下段: 区分名と寸法の入力欄。区分に応じて寸法の欄を切り替える。
//   寸法切・アイトレ・ササラ → 板厚 × 縦 × 横（ササラは使用材の寸法）
//   ベタ丸               → 板厚 × 直径
//   ドーナツ             → 板厚 × 外径 × 内径
//   定尺                 → 板厚 × 定尺サイズ
// 区分が決まっていないときは板厚だけを表示する。

import type { DimensionKind } from '@/lib/order-entry/item-types'
import { CircleDimensions } from './circle-dimensions'
import type { DimensionInputProps } from './dimension-props'
import { RectangleDimensions } from './rectangle-dimensions'
import { StandardSizeDimensions } from './standard-size-dimensions'
import { ThicknessField } from './thickness-field'

type DimensionFieldsProps = DimensionInputProps & {
  kind: DimensionKind | null
  // 区分の名称（「寸法切」「ベタ丸」など）
  regionLabel: string
}

export function DimensionFields({ kind, regionLabel, ...props }: DimensionFieldsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-16 shrink-0 truncate text-sm text-neutral-600 dark:text-neutral-400">
        {regionLabel}
      </span>
      {kind === 'rectangle' && <RectangleDimensions {...props} />}
      {(kind === 'circle' || kind === 'donut') && (
        <CircleDimensions {...props} withInnerDiameter={kind === 'donut'} />
      )}
      {kind === 'plateSize' && <StandardSizeDimensions {...props} />}
      {kind === null && <ThicknessField {...props} />}
    </div>
  )
}
