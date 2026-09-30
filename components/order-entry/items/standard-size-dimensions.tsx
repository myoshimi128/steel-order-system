'use client'

// 寸法の欄（定尺売り）: 板厚 × 定尺サイズ（1 3x6 / 2 4x8 / 3 5x10）。

import { CodeField } from '@/components/code-input/code-field'
import { PLATE_SIZE_OPTIONS } from '@/lib/order-entry/constants'
import type { DimensionInputProps } from './dimension-props'
import { ThicknessField } from './thickness-field'

export function StandardSizeDimensions(props: DimensionInputProps) {
  const { row, errors, fieldProps, onChange } = props
  return (
    <>
      <ThicknessField {...props} />
      <span className="text-neutral-400">×</span>
      <CodeField
        {...fieldProps('plateSize')}
        listTitle="定尺サイズ"
        options={PLATE_SIZE_OPTIONS}
        code={row.plateSize}
        onCodeChange={(code) => onChange('plateSize', code)}
        error={errors.plateSize}
        codeWidthClass="w-10"
        nameWidthClass="w-14"
        showErrorText={false}
      />
    </>
  )
}
