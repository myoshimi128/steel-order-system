'use client'

// 入力の形「穴」: 1S/ [孔数]孔 [穴径]φ（レーザー・プラズマ孔・ガス孔・キリ孔）。
// 伝票の表記どおりに並べ、左から順（孔数 → 穴径）に入力する。
// 孔数は 1 枚あたりの数で、加工の数量は「孔数 × 母材の枚数」で自動で求める。

import { NumericField } from '@/components/code-input/numeric-field'
import type { DimensionInputProps } from '../dimension-props'

export function HoleSpecFields({ row, errors, fieldProps, onChange }: DimensionInputProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-neutral-500 dark:text-neutral-400">1S/</span>
      <NumericField
        {...fieldProps('holesPerPiece')}
        value={row.holesPerPiece}
        onValueChange={(value) => onChange('holesPerPiece', value)}
        error={errors.holesPerPiece}
        widthClass="w-12"
        showErrorText={false}
      />
      <span className="text-neutral-500 dark:text-neutral-400">孔</span>
      <NumericField
        {...fieldProps('holeDiameter')}
        value={row.holeDiameter}
        onValueChange={(value) => onChange('holeDiameter', value)}
        error={errors.holeDiameter}
        allowDecimal
        widthClass="w-16"
        showErrorText={false}
      />
      <span className="text-neutral-500 dark:text-neutral-400">φ</span>
    </div>
  )
}
