'use client'

// 納期の欄（種別＋日付）。
// 種別が確定・仮納期のときだけ日付の欄を表示する。後報（待ち）・最短出荷（急ぎ）は日付なし。

import { CodeField } from '@/components/code-input/code-field'
import { DateField } from '@/components/code-input/date-field'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { DUE_DATE_TYPE_OPTIONS } from '@/lib/order-entry/constants'
import type { OrderHeaderState } from '@/lib/order-entry/use-order-header'

type DueDateFieldsProps = {
  header: OrderHeaderState
  navigation: FieldNavigation
  today: string
}

export function DueDateFields({ header, navigation, today }: DueDateFieldsProps) {
  return (
    <div className="flex items-start gap-2">
      <CodeField
        {...navigation.fieldProps('dueDateType')}
        label="納期"
        options={DUE_DATE_TYPE_OPTIONS}
        code={header.values.dueDateType}
        onCodeChange={(code) => header.setValue('dueDateType', code)}
        error={header.errors.dueDateType}
        codeWidthClass="w-10"
        nameWidthClass="w-20"
      />
      {header.needsDueDate && (
        <DateField
          {...navigation.fieldProps('dueDate')}
          value={header.values.dueDate}
          onValueChange={(value) => header.setValue('dueDate', value)}
          today={today}
          error={header.errors.dueDate}
        />
      )}
    </div>
  )
}
