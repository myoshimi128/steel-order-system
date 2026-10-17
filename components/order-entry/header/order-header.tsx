'use client'

// ① 受注情報の入力欄（docs/screen-design.md「① 受注情報」）。
//   1 行目: 処理区分・受注 No.・部材区分（SPL のときは継手番号・ショット）・受注日
//   2 行目: 売り先・客先担当
//   3 行目: 入れ先
//   4 行目: 工事名
//   5 行目: 納期（種別＋日付）・配達（フリーのときは文字の欄）
// 担当者・加工場所・受付No. は、受付の機能と同じ PR で加える。
//
// 入力値と表示の切り替えは useOrderHeader、欄の移動は useFieldNavigation が管理し、
// この部品は並べて表示するだけにする。

import { CodeField } from '@/components/code-input/code-field'
import { DateField } from '@/components/code-input/date-field'
import { TextField } from '@/components/code-input/text-field'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { MEMBER_CLASS_OPTIONS, PROCESSING_TYPE_OPTIONS } from '@/lib/order-entry/constants'
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
    <section className="flex flex-col gap-4 p-5">
      {/* 1 行目 */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
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
          <span className="text-sm text-neutral-600">受注 No.</span>
          <span className="w-36 rounded border border-line bg-canvas px-3 py-1.5 text-sm text-neutral-400">
            （登録時に採番）
          </span>
        </div>

        <CodeField
          {...navigation.fieldProps('memberClass')}
          label="部材区分"
          options={MEMBER_CLASS_OPTIONS}
          code={values.memberClass}
          onCodeChange={(code) => setValue('memberClass', code)}
          error={errors.memberClass}
          codeWidthClass="w-10"
          nameWidthClass="w-16"
        />
        {/* 部材区分が SPL（スプライス専用の受注）のときだけ、継手番号とショットを出す */}
        {header.isSplice && <SpliceFields header={header} navigation={navigation} />}

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

      {/* 2 行目: 売り先は名称が長いため広く取る */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
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
          label="客先担当"
          value={values.customerContact}
          onValueChange={(value) => setValue('customerContact', value)}
          error={errors.customerContact}
          widthClass="w-40"
        />
      </div>

      {/* 3 行目 */}
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

      {/* 4 行目 */}
      <TextField
        {...navigation.fieldProps('projectName')}
        label="工事名"
        value={values.projectName}
        onValueChange={(value) => setValue('projectName', value)}
        error={errors.projectName}
        widthClass="w-[34rem]"
      />

      {/* 5 行目 */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <DueDateFields header={header} navigation={navigation} today={today} />
        <DeliveryFields header={header} navigation={navigation} options={masters.deliveryMethods} />
      </div>
    </section>
  )
}
