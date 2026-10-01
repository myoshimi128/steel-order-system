'use client'

// 受注登録画面のヘッダー（3 行）。docs/screen-design.md「ヘッダー」と画面デザインの画像に合わせる。
//   1 行目: 処理区分・受注 No.・スプライス（1 のとき継手番号・ショット）・受注日
//   2 行目: 売り先・担当者・入れ先
//   3 行目: 工事名・納期（種別＋日付）・配達（フリーのときは文字の欄）
//
// 入力値と表示の切り替えは useOrderHeader、欄の移動は useFieldNavigation が管理し、
// この部品は並べて表示するだけにする。

import { CodeField } from '@/components/code-input/code-field'
import { DateField } from '@/components/code-input/date-field'
import { TextField } from '@/components/code-input/text-field'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { PROCESSING_TYPE_OPTIONS, SPLICE_OPTIONS } from '@/lib/order-entry/constants'
import type { HeaderMasterOptions, OrderHeaderState } from '@/lib/order-entry/use-order-header'
import { DeliveryFields } from './delivery-fields'
import { DueDateFields } from './due-date-fields'
import { SpliceFields } from './splice-fields'

type OrderHeaderProps = {
  header: OrderHeaderState
  navigation: FieldNavigation
  masters: HeaderMasterOptions
  today: string
}

export function OrderHeader({ header, navigation, masters, today }: OrderHeaderProps) {
  const { values, errors, setValue } = header

  return (
    <section className="flex flex-col gap-3 border-b border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-950">
      {/* 1 行目 */}
      <div className="flex items-start gap-6">
        <CodeField
          {...navigation.fieldProps('processingType')}
          label="処理区分"
          options={PROCESSING_TYPE_OPTIONS}
          code={values.processingType}
          onCodeChange={(code) => setValue('processingType', code)}
          error={errors.processingType}
          codeWidthClass="w-10"
          nameWidthClass="w-14"
        />

        {/* 受注 No.: 新規は登録時に自動採番するため、入力欄ではなく表示のみ */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-600 dark:text-neutral-400">受注 No.</span>
          <span className="w-32 rounded border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-sm text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
            （自動採番）
          </span>
        </div>

        <CodeField
          {...navigation.fieldProps('isSplice')}
          label="スプライス"
          options={SPLICE_OPTIONS}
          code={values.isSplice}
          onCodeChange={(code) => setValue('isSplice', code)}
          error={errors.isSplice}
          codeWidthClass="w-10"
          // 名称「スプライス」（5 文字）が切れずに収まる幅
          nameWidthClass="w-24"
        />
        {header.isSplice && <SpliceFields header={header} navigation={navigation} />}

        {/* 受注日は右端に置く（ml-auto で残りの幅を左に寄せる） */}
        <div className="ml-auto">
          <DateField
            {...navigation.fieldProps('orderDate')}
            label="受注日"
            value={values.orderDate}
            onValueChange={(value) => setValue('orderDate', value)}
            today={today}
            error={errors.orderDate}
          />
        </div>
      </div>

      {/* 2 行目: 売り先と入れ先は名称が長いため広く取る */}
      <div className="flex items-start gap-6">
        <CodeField
          {...navigation.fieldProps('customerId')}
          label="売り先"
          options={masters.customers}
          // 件数が多いため、一覧にふりがな・名前の検索の欄を付ける
          searchable
          code={values.customerId}
          onCodeChange={(code) => setValue('customerId', code)}
          error={errors.customerId}
          codeWidthClass="w-16"
          nameWidthClass="w-72"
        />
        <TextField
          {...navigation.fieldProps('customerContact')}
          label="担当者"
          value={values.customerContact}
          onValueChange={(value) => setValue('customerContact', value)}
          error={errors.customerContact}
          widthClass="w-36"
        />
        <CodeField
          {...navigation.fieldProps('deliveryDestinationId')}
          label="入れ先"
          options={masters.destinations}
          searchable
          code={values.deliveryDestinationId}
          onCodeChange={(code) => setValue('deliveryDestinationId', code)}
          error={errors.deliveryDestinationId}
          codeWidthClass="w-16"
          nameWidthClass="w-72"
        />
      </div>

      {/* 3 行目 */}
      <div className="flex items-start gap-6">
        {/* 工事名は右端を 2 行目の担当者に揃える幅にする */}
        <TextField
          {...navigation.fieldProps('projectName')}
          label="工事名"
          value={values.projectName}
          onValueChange={(value) => setValue('projectName', value)}
          error={errors.projectName}
          widthClass="w-[37rem]"
        />
        <DueDateFields header={header} navigation={navigation} today={today} />
        <DeliveryFields header={header} navigation={navigation} options={masters.deliveryMethods} />
      </div>
    </section>
  )
}
