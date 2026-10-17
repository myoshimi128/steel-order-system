'use client'

// 寸法の欄（角）: 板厚 × 縦 × 横。寸法切・アイトレと、ササラ（使用材の寸法）で使う。

import { NumericField } from '@/components/code-input/numeric-field'
import type { DimensionInputProps } from './dimension-props'
import { ThicknessField } from './thickness-field'

export function RectangleDimensions(props: DimensionInputProps) {
  const { row, errors, fieldProps, onChange } = props
  return (
    <>
      <ThicknessField {...props} />
      <span className="text-neutral-400">×</span>
      <NumericField
        {...fieldProps('width')}
        value={row.width}
        onValueChange={(value) => onChange('width', value)}
        error={errors.width}
        allowDecimal
        // 品名の欄の幅に合わせて伸び縮みする（最小 72px〜最大 128px）
        className="min-w-[4.5rem] max-w-32 flex-1"
        widthClass="min-w-0 flex-1"
        showErrorText={false}
      />
      <span className="text-neutral-400">×</span>
      <NumericField
        {...fieldProps('length')}
        value={row.length}
        onValueChange={(value) => onChange('length', value)}
        error={errors.length}
        allowDecimal
        // 品名の欄の幅に合わせて伸び縮みする（最小 72px〜最大 128px）
        className="min-w-[4.5rem] max-w-32 flex-1"
        widthClass="min-w-0 flex-1"
        showErrorText={false}
      />
    </>
  )
}
