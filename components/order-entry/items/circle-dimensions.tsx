'use client'

// 寸法の欄（円・ドーナツ）: ベタ丸は 板厚 × 直径、ドーナツは 板厚 × 外径 × 内径。
// 列の幅に収めるため、欄の見出しは付けず、空欄の中の薄い文字（直径・外径・内径）で何を入れる欄かを示す。

import { NumericField } from '@/components/code-input/numeric-field'
import type { DimensionInputProps } from './dimension-props'
import { ThicknessField } from './thickness-field'

type CircleDimensionsProps = DimensionInputProps & {
  // ドーナツ（内径の欄も出す）か
  withInnerDiameter: boolean
}

export function CircleDimensions({ withInnerDiameter, ...props }: CircleDimensionsProps) {
  const { row, errors, fieldProps, onChange } = props
  return (
    <>
      <ThicknessField {...props} />
      <span className="text-neutral-400">×</span>
      <NumericField
        {...fieldProps('outerDiameter')}
        value={row.outerDiameter}
        onValueChange={(value) => onChange('outerDiameter', value)}
        error={errors.outerDiameter}
        allowDecimal
        widthClass="w-[3.75rem]"
        placeholder={withInnerDiameter ? '外径' : '直径'}
        dense
        showErrorText={false}
      />
      {withInnerDiameter && (
        <>
          <span className="text-neutral-400">×</span>
          <NumericField
            {...fieldProps('innerDiameter')}
            value={row.innerDiameter}
            onValueChange={(value) => onChange('innerDiameter', value)}
            error={errors.innerDiameter}
            allowDecimal
            widthClass="w-[3.75rem]"
            placeholder="内径"
            dense
            showErrorText={false}
          />
        </>
      )}
    </>
  )
}
