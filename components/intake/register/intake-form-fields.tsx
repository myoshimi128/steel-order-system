'use client'

// 受付登録の受注情報の入力欄（docs/intake/screen-design.md「受注情報の入力欄」の受付登録の列）。
//   受付日・担当者 / 売り先 *・客先担当 / 入れ先（複数）/ 工事名 / 納期（種別＋日付）・配達 / 加工場所・至急
// 処理区分・受付No. は画面の上の帯（IntakeRegisterScreen）に置く。
// 納期・配達・加工場所の欄は、受注登録の受注情報の部品（components/order-entry/header/）をそのまま使う。
// 入力値は useIntakeForm、欄の移動は useFieldNavigation が持ち、この部品は並べて表示するだけにする。

import { CodeField } from '@/components/code-input/code-field'
import { DateField } from '@/components/code-input/date-field'
import { TextField } from '@/components/code-input/text-field'
import { CodeChipsField } from '@/components/order-entry/header/code-chips-field'
import { DeliveryFields } from '@/components/order-entry/header/delivery-fields'
import { DueDateFields } from '@/components/order-entry/header/due-date-fields'
import { FormItem } from '@/components/order-entry/header/form-item'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import type { IntakeFormMasters } from '@/lib/intake/intake-form'
import type { IntakeFormState } from '@/lib/intake/use-intake-form'
import { DestinationRows } from './destination-rows'
import { UrgentField } from './urgent-field'

type IntakeFormFieldsProps = {
  form: IntakeFormState
  navigation: FieldNavigation
  masters: IntakeFormMasters
  today: string
}

export function IntakeFormFields({ form, navigation, masters, today }: IntakeFormFieldsProps) {
  const { values, errors, setValue } = form

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
      <FormItem label="受付日" htmlFor="intakeDate">
        <DateField
          {...navigation.fieldProps('intakeDate')}
          value={values.intakeDate}
          onValueChange={(value) => setValue('intakeDate', value)}
          today={today}
          error={errors.intakeDate}
        />
      </FormItem>
      <FormItem label="担当者" htmlFor="staffId" note="社員No. ／ / で一覧">
        <CodeField
          {...navigation.fieldProps('staffId')}
          listTitle="担当者"
          options={masters.staff}
          searchable
          code={values.staffId}
          onCodeChange={(code) => setValue('staffId', code)}
          error={errors.staffId}
          codeWidthClass="w-24"
          nameWidthClass="w-32"
        />
      </FormItem>

      <FormItem label="売り先" htmlFor="customerId" required note="コード入力 ／ / か End で一覧">
        <CodeField
          {...navigation.fieldProps('customerId')}
          listTitle="売り先"
          options={masters.customers}
          maxLength={CODE_LENGTHS.customer}
          searchable
          code={values.customerId}
          onCodeChange={(code) => setValue('customerId', code)}
          error={errors.customerId}
          codeWidthClass="w-20"
          nameWidthClass="w-56"
        />
      </FormItem>
      <FormItem label="客先担当" htmlFor="customerContact">
        <TextField
          {...navigation.fieldProps('customerContact')}
          value={values.customerContact}
          onValueChange={(value) => setValue('customerContact', value)}
          error={errors.customerContact}
          widthClass="w-full"
        />
      </FormItem>

      <FormItem label="入れ先（納入先）" className="col-span-2" note="0 は売り先と同じ。複数あるときは追加">
        <DestinationRows form={form} navigation={navigation} options={masters.destinations} />
      </FormItem>

      <FormItem label="工事名" htmlFor="projectName" className="col-span-2">
        <TextField
          {...navigation.fieldProps('projectName')}
          value={values.projectName}
          onValueChange={(value) => setValue('projectName', value)}
          error={errors.projectName}
          widthClass="w-full"
        />
      </FormItem>

      <FormItem label="納期" htmlFor="dueDateType" note="未定なら 3 後報">
        <DueDateFields header={form} navigation={navigation} today={today} />
      </FormItem>
      <FormItem label="配達" htmlFor="deliveryMethodId">
        <DeliveryFields header={form} navigation={navigation} options={masters.deliveryMethods} />
      </FormItem>

      <FormItem label="加工場所" htmlFor="siteId" note="受注登録のときにも変更できます">
        <CodeChipsField
          {...navigation.fieldProps('siteId')}
          listTitle="加工場所"
          options={masters.sites}
          maxLength={CODE_LENGTHS.site}
          code={values.siteId}
          onCodeChange={(code) => setValue('siteId', code)}
          error={errors.siteId}
        />
      </FormItem>
      <FormItem label="至急" htmlFor="urgent" note="0 通常 / 1 至急">
        <UrgentField
          {...navigation.fieldProps('urgent')}
          code={values.urgent}
          onCodeChange={(code) => setValue('urgent', code)}
          error={errors.urgent}
        />
      </FormItem>
    </div>
  )
}
