'use client'

// 配達の欄。フリー（delivery_methods.requires_note が true）を選んだときだけ、
// 文字を入力する欄を表示する。

import { CodeField } from '@/components/code-input/code-field'
import { TextField } from '@/components/code-input/text-field'
import type { CodeOption } from '@/lib/code-input/code-option'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import type { OrderHeaderState } from '@/lib/order-entry/use-order-header'

type DeliveryFieldsProps = {
  header: OrderHeaderState
  navigation: FieldNavigation
  options: readonly CodeOption<string>[]
}

export function DeliveryFields({ header, navigation, options }: DeliveryFieldsProps) {
  return (
    <div className="flex items-start gap-2">
      <CodeField
        {...navigation.fieldProps('deliveryMethodId')}
        label="配達"
        options={options}
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
