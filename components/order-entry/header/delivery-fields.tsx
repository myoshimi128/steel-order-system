'use client'

// 配達の欄。フリー（delivery_methods.requires_note が true）を選んだときだけ、
// 文字を入力する欄を表示する。項目名「配達」は欄の上（FormItem）に出すため、ここでは付けない。
// 受注情報（useOrderHeader）と受付登録（useIntakeForm）で使い回すため、入力の状態は必要な分だけの形で受け取る。

import { CodeField } from '@/components/code-input/code-field'
import { TextField } from '@/components/code-input/text-field'
import type { CodeOption } from '@/lib/code-input/code-option'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'

// 配達の欄が使う入力の状態。受注情報・受付登録のフックの戻り値は、どちらもこの形を満たす
export type DeliveryFieldsState = {
  values: { deliveryMethodId: string; deliveryMethodNote: string }
  errors: { deliveryMethodId?: string; deliveryMethodNote?: string }
  setValue: (field: 'deliveryMethodId' | 'deliveryMethodNote', value: string) => void
  // 文字の欄を出すか（フリー）
  requiresDeliveryNote: boolean
}

type DeliveryFieldsProps = {
  header: DeliveryFieldsState
  navigation: FieldNavigation
  options: readonly CodeOption<string>[]
}

export function DeliveryFields({ header, navigation, options }: DeliveryFieldsProps) {
  return (
    <div className="flex items-start gap-2">
      <CodeField
        {...navigation.fieldProps('deliveryMethodId')}
        listTitle="配達"
        options={options}
        maxLength={CODE_LENGTHS.deliveryMethod}
        code={header.values.deliveryMethodId}
        onCodeChange={(code) => header.setValue('deliveryMethodId', code)}
        error={header.errors.deliveryMethodId}
        codeWidthClass="w-10"
        nameWidthClass="w-24"
      />
      {header.requiresDeliveryNote && (
        <TextField
          {...navigation.fieldProps('deliveryMethodNote')}
          value={header.values.deliveryMethodNote}
          onValueChange={(value) => header.setValue('deliveryMethodNote', value)}
          error={header.errors.deliveryMethodNote}
          widthClass="w-40"
        />
      )}
    </div>
  )
}
