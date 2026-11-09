'use client'

// 送り状の入力の、出荷日と「納期を確定にする」の欄。
// 納期の欄は、受注の納期が確定でない（仮納期・後報・最短出荷）ときだけ出す。発行と同時に、受注の納期を確定にしてこの日付を入れる。
// 日付はテンキーで「1105」（今年の 11 月 5 日）のように打つ（DateField。受注登録と同じ）。

import { DateField } from '@/components/code-input/date-field'
import { FormItem } from '@/components/order-entry/header/form-item'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { dueDateText } from '@/lib/shipments/shipment-format'
import type { ShipmentEntry } from '@/lib/shipments/use-shipment-entry'

type ShipmentDateFieldsProps = {
  entry: ShipmentEntry
  navigation: FieldNavigation
  today: string
  // 今の受注の納期（「仮納期 10/30（金）」などの案内に使う）
  dueDateType: string
  dueDate: string | null
}

export function ShipmentDateFields({ entry, navigation, today, dueDateType, dueDate }: ShipmentDateFieldsProps) {
  return (
    <section className="flex items-start gap-10 rounded border border-line bg-white px-5 py-4">
      <FormItem label="出荷日" htmlFor="shippedDate" required note="月日4桁">
        <DateField
          {...navigation.fieldProps('shippedDate')}
          value={entry.shippedDate}
          onValueChange={entry.setShippedDate}
          today={today}
          error={entry.dateErrors.shippedDate}
        />
      </FormItem>

      {entry.needsDueDate && (
        <FormItem label="納期を確定にする" htmlFor="dueDate" required note={`今は「${dueDateText(dueDateType, dueDate)}」`}>
          <DateField
            {...navigation.fieldProps('dueDate')}
            value={entry.dueDate}
            onValueChange={entry.setDueDate}
            today={today}
            error={entry.dateErrors.dueDate}
          />
        </FormItem>
      )}
      {entry.needsDueDate && (
        <p className="mt-6 max-w-sm text-xs text-attention">
          この受注の納期は確定していません。発行すると、受注の納期を確定にしてこの日付を入れます（現場用伝票は「印刷の後に変更」になります）
        </p>
      )}
    </section>
  )
}
