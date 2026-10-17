'use client'

// 板厚の欄。寸法の入力では最初に板厚を入れる（どの区分でも共通）。

import { NumericField } from '@/components/code-input/numeric-field'
import type { DimensionInputProps } from './dimension-props'

export function ThicknessField({ row, errors, fieldProps, onChange }: DimensionInputProps) {
  return (
    <NumericField
      {...fieldProps('thickness')}
      value={row.thickness}
      onValueChange={(value) => onChange('thickness', value)}
      error={errors.thickness}
      allowDecimal
      // 幅は固定（44px）。広い画面でも引き伸ばさない（docs/screen-design.md「明細の表」）
      widthClass="w-11"
      placeholder="板厚"
      dense
      showErrorText={false}
    />
  )
}
