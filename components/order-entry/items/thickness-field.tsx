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
      widthClass="w-16"
      showErrorText={false}
    />
  )
}
