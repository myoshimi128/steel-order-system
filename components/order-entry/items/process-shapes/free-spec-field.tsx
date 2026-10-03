'use client'

// 入力の形「自由入力」: 加工内容を文字で入力する（形を決めていない加工種別。例: 1S/ 2孔 30X12φ）。

import { TextField } from '@/components/code-input/text-field'
import type { DimensionInputProps } from '../dimension-props'

export function FreeSpecField({ row, errors, fieldProps, onChange }: DimensionInputProps) {
  return (
    <TextField
      {...fieldProps('spec')}
      value={row.spec}
      onValueChange={(value) => onChange('spec', value)}
      error={errors.spec}
      widthClass="w-full"
      showErrorText={false}
    />
  )
}
