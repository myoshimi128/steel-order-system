'use client'

// 寸法の欄（円・ドーナツ）: ベタ丸は 板厚 × 直径、ドーナツは 板厚 × 外径 × 内径。

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
        label={withInnerDiameter ? '外径' : '直径'}
        value={row.outerDiameter}
        onValueChange={(value) => onChange('outerDiameter', value)}
        error={errors.outerDiameter}
        allowDecimal
        widthClass="w-24"
        showErrorText={false}
      />
      {withInnerDiameter && (
        <>
          <span className="text-neutral-400">×</span>
          <NumericField
            {...fieldProps('innerDiameter')}
            label="内径"
            value={row.innerDiameter}
            onValueChange={(value) => onChange('innerDiameter', value)}
            error={errors.innerDiameter}
            allowDecimal
            widthClass="w-24"
            showErrorText={false}
          />
        </>
      )}
    </>
  )
}
