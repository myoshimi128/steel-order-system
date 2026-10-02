'use client'

// 加工の行の品名の位置: 加工の項目の入力欄。加工種別の「入力の形」で部品を切り替える
// （docs/screen-design.md「加工の項目（入力の形）」）。
//   自由入力 → 加工内容（文字）
//   穴       → 1S/ [孔数]孔 [穴径]φ
//   曲げ     → [ヶ所] [曲げ方] 曲げ
// 材料の行の寸法の欄（dimension-fields.tsx）と同じ作り方で、加工種別の名前では分岐しない。

import type { ProcessInputShape } from '@/lib/order-entry/constants'
import type { DimensionInputProps } from '../dimension-props'
import { BendSpecFields } from './bend-spec-fields'
import { FreeSpecField } from './free-spec-field'
import { HoleSpecFields } from './hole-spec-fields'

type ProcessSpecFieldsProps = DimensionInputProps & {
  shape: ProcessInputShape
}

export function ProcessSpecFields({ shape, ...props }: ProcessSpecFieldsProps) {
  switch (shape) {
    case '穴':
      return <HoleSpecFields {...props} />
    case '曲げ':
      return <BendSpecFields {...props} />
    case '自由入力':
      return <FreeSpecField {...props} />
  }
}
