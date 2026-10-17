'use client'

// 補助エリアの「フリーコメント」の枠。受注全体のコメント（orders.field_note）で、現場用伝票に印字する。
// 明細ごとのコメントは各行の摘要に入力する。
// Enter で登録ボタンへ進み、改行は Ctrl+Enter で入れる（TextAreaField）。

import { TextAreaField } from '@/components/code-input/text-area-field'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { AuxPanel } from './aux-panel'

type FreeCommentPanelProps = {
  value: string
  onValueChange: (value: string) => void
  // 入力順の管理用の props（textarea にも渡せるよう、useFieldNavigation の fieldProps の戻り値の型）
  fieldProps: ReturnType<FieldNavigation['fieldProps']>
}

export function FreeCommentPanel({ value, onValueChange, fieldProps }: FreeCommentPanelProps) {
  return (
    <AuxPanel title="フリーコメント" note="Ctrl + Enter で改行">
      <TextAreaField {...fieldProps} value={value} onValueChange={onValueChange} rows={4} />
    </AuxPanel>
  )
}
