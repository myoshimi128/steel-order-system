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
        // 幅は固定（60px。5 桁まで入る）
        widthClass="w-[3.75rem]"
        placeholder="縦"
        dense
        showErrorText={false}
      />
      <span className="text-neutral-400">×</span>
      <NumericField
        {...fieldProps('length')}
        value={row.length}
        onValueChange={(value) => onChange('length', value)}
        error={errors.length}
        allowDecimal
        widthClass="w-[3.75rem]"
        placeholder="横"
        dense
        showErrorText={false}
      />
    </>
  )
}
