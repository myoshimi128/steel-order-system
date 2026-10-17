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
      // 品名の欄の幅に合わせて伸び縮みする（最小 56px〜最大 96px）。
      // 最小の幅は、1280px の画面で寸法の欄が品名の欄に収まるように決めている（item-grid.ts）
      className="min-w-14 max-w-24 flex-1"
      widthClass="min-w-0 flex-1"
      showErrorText={false}
    />
  )
}
