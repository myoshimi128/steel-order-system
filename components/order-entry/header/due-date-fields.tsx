'use client'

// 納期の欄（種別＋日付）。
// 種別が確定・仮納期のときだけ日付の欄を表示する。後報（待ち）・最短出荷（急ぎ）は日付なし。
// 項目名「納期」は欄の上（FormItem）に出すため、ここでは付けない。
// 受注情報（useOrderHeader）と受付登録（useIntakeForm）で使い回すため、入力の状態は必要な分だけの形で受け取る。

import { CodeField } from '@/components/code-input/code-field'
import { DateField } from '@/components/code-input/date-field'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { DUE_DATE_TYPE_OPTIONS } from '@/lib/order-entry/constants'

// 納期の欄が使う入力の状態。受注情報・受付登録のフックの戻り値は、どちらもこの形を満たす
export type DueDateFieldsState = {
  values: { dueDateType: string; dueDate: string }
  errors: { dueDateType?: string; dueDate?: string }
  setValue: (field: 'dueDateType' | 'dueDate', value: string) => void
  // 日付の欄を出すか（確定・仮納期）
  needsDueDate: boolean
}

type DueDateFieldsProps = {
  header: DueDateFieldsState
  navigation: FieldNavigation
  today: string
}

export function DueDateFields({ header, navigation, today }: DueDateFieldsProps) {
  return (
    <div className="flex items-start gap-2">
      <CodeField
        {...navigation.fieldProps('dueDateType')}
        listTitle="納期"
        options={DUE_DATE_TYPE_OPTIONS}
        maxLength={CODE_LENGTHS.dueDateType}
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
