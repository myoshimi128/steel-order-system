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
      // 幅は固定（56px）。1280px の画面で、一番長いドーナツの寸法が品名の欄に収まる幅にしている（item-grid.ts）
      widthClass="w-14"
      showErrorText={false}
    />
  )
}
