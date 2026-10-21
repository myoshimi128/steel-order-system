'use client'

// ① 受注情報の入力欄（docs/screen-design.md「① 受注情報」、docs/intake/screen-design.md「S-06c 受注情報」）。
//
//   ┌ 受付No. 26-1003 [先寸] 受付: 担当者   ┐┌ 受注No. 26-1003-2（登録時に採番）    ┐  ← 上部の帯
//   │                                      ││ この受付の受注: 26-1003-1（GPL）     │
//   │ 処理区分                │ 受注日                          │
//   │ 担当者（自社）           │ 至急（0 通常 / 1 至急）          │
//   │ 売り先 *                │ 納期（種別＋日付）               │
//   │ 客先担当                │ 配達（フリーのときは文字の欄）    │
//   │ 工事名                                                    │
//   │ 入れ先                                                    │
//   │ 加工場所（1 本社 / 2 A営業所 / 3 B営業所）                 │
//   │ 部材区分（1 DF / 2 GPL / 3 BH / 4 SPL / 0 無分類）＋ SPL のときは継手番号・ショット │
//
// 項目名は欄の上に置く（FormItem）。加工場所・部材区分は選択肢をボタン状に並べて見せる（CodeChipsField）。
// 受付から入った値のままの欄は、薄い青で見せる（FormItem の fromIntake。手で直すと通常の見た目に戻る）。
// 入れ先の「/」の一覧の先頭には、受付の入れ先を「受付 1」「受付 2」…の印を付けて並べる。
// 入力値と表示の切り替えは useOrderHeader、欄の移動は useFieldNavigation が管理し、
// この部品は並べて表示するだけにする。

import { CodeField } from '@/components/code-input/code-field'
import { DateField } from '@/components/code-input/date-field'
import { TextField } from '@/components/code-input/text-field'
import { UrgentField } from '@/components/intake/register/urgent-field'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { WORK_UNIT_KIND_LABELS, WORK_UNIT_ORIGIN_LABELS } from '@/lib/intake/constants'
import { MEMBER_CLASS_OPTIONS, PROCESSING_TYPE_OPTIONS } from '@/lib/order-entry/constants'
import {
  destinationOptionsWithIntake,
  nextOrderNoText,
  type OrderIntakeSource,
} from '@/lib/order-entry/intake-defaults'
import type { HeaderMasterOptions, OrderHeaderState } from '@/lib/order-entry/use-order-header'
import { CodeChipsField } from './code-chips-field'
import { DeliveryFields } from './delivery-fields'
import { DueDateFields } from './due-date-fields'
import { FormItem } from './form-item'
import { SpliceFields } from './splice-fields'

type OrderHeaderProps = {
  header: OrderHeaderState
  navigation: FieldNavigation
  masters: HeaderMasterOptions
  today: string
  // 受注登録待ちの一覧で選んだ加工区分と、その受付
  intake: OrderIntakeSource
}

// 登録済みの受注の一覧の文（「26-1003-1（GPL）、26-1003-2（SPL）」）
function registeredOrdersText(intake: OrderIntakeSource): string {
  if (intake.registeredOrders.length === 0) return 'まだありません'
  return intake.registeredOrders
    .map((order) => {
      const memberClass = MEMBER_CLASS_OPTIONS.find((item) => item.value === order.memberClass)?.label
      return `${order.orderNo}（${memberClass ?? order.memberClass}）`
    })
    .join('、')
}

export function OrderHeader({ header, navigation, masters, today, intake }: OrderHeaderProps) {
  const { values, errors, setValue, fromIntake } = header
  const origin = WORK_UNIT_ORIGIN_LABELS[intake.origin]
  // 入れ先の一覧（受付の入れ先を先頭に並べる）
  const destinationOptions = destinationOptionsWithIntake(intake.destinationIds, masters.destinations)

  return (
    <section className="flex flex-col">
      {/* 上部の帯: 受付No.（区分・受付の担当者）と 受注No.（次の枝番・この受付の登録済みの受注）。どちらも表示のみ */}
      <div className="grid grid-cols-2 gap-6 border-b border-line bg-navy-soft/60 px-6 py-4">
        <FormItem label="受付No.">
          <div className="flex flex-wrap items-center gap-2 py-1">
            <span className="text-xl font-bold tabular-nums text-navy">{intake.intakeNo}</span>
            <span
              className={`rounded px-2 py-0.5 text-xs font-bold ${
                intake.kind === 'aitore' ? 'bg-navy text-white' : 'border border-navy bg-white text-navy'
              }`}
            >
              {WORK_UNIT_KIND_LABELS[intake.kind]}
            </span>
            {origin && <span className="rounded bg-white px-1.5 py-0.5 text-xs text-neutral-600">{origin}</span>}
            {intake.isUrgent && (
              <span className="rounded bg-urgent px-1.5 py-0.5 text-xs font-bold text-white">至急</span>
            )}
            <span className="text-sm text-neutral-600">受付: {intake.intakeStaffName ?? '—'}</span>
          </div>
        </FormItem>
        <FormItem label="受注No." note="登録時に採番">
          <div className="flex flex-col gap-0.5 py-1">
            <span className="text-xl font-bold tabular-nums text-navy">{nextOrderNoText(intake)}</span>
            <span className="text-xs text-neutral-600">この受付の受注: {registeredOrdersText(intake)}</span>
          </div>
        </FormItem>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 px-6 py-5">
        <FormItem label="処理区分" htmlFor="processingType">
          <CodeField
            {...navigation.fieldProps('processingType')}
            listTitle="処理区分"
            options={PROCESSING_TYPE_OPTIONS}
            maxLength={CODE_LENGTHS.processingType}
            code={values.processingType}
            onCodeChange={(code) => setValue('processingType', code)}
            error={errors.processingType}
            codeWidthClass="w-12"
            nameWidthClass="w-20"
          />
        </FormItem>
        <FormItem label="受注日" htmlFor="orderDate">
          <DateField
            {...navigation.fieldProps('orderDate')}
            value={values.orderDate}
            onValueChange={(value) => setValue('orderDate', value)}
            today={today}
            error={errors.orderDate}
          />
        </FormItem>

        <FormItem label="担当者（自社）" htmlFor="staffId" note="社員No. ／ / で一覧">
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
        <FormItem label="至急" htmlFor="isUrgent" fromIntake={fromIntake('isUrgent')}>
          <UrgentField
            {...navigation.fieldProps('isUrgent')}
            code={values.isUrgent}
            onCodeChange={(code) => setValue('isUrgent', code)}
            urgentNote="現場で優先して加工してもらいます"
          />
        </FormItem>

        <FormItem
          label="売り先"
          htmlFor="customerId"
          required
          note="コード入力 ／ / か End で一覧"
          fromIntake={fromIntake('customerId')}
        >
          <CodeField
            {...navigation.fieldProps('customerId')}
            listTitle="売り先"
            options={masters.customers}
            maxLength={CODE_LENGTHS.customer}
            // 件数が多いため、一覧にふりがな・名前の検索の欄を付ける
            searchable
            code={values.customerId}
            onCodeChange={(code) => setValue('customerId', code)}
            error={errors.customerId}
            codeWidthClass="w-20"
            nameWidthClass="w-60"
          />
        </FormItem>
        <FormItem
          label="納期"
          htmlFor="dueDateType"
          // 種別と日付のどちらも受付の値のままなら、受付の値として見せる
          fromIntake={fromIntake('dueDateType') && (values.dueDate === '' || fromIntake('dueDate'))}
        >
          <DueDateFields header={header} navigation={navigation} today={today} />
        </FormItem>

        <FormItem label="客先担当" htmlFor="customerContact" fromIntake={fromIntake('customerContact')}>
          <TextField
            {...navigation.fieldProps('customerContact')}
            value={values.customerContact}
            onValueChange={(value) => setValue('customerContact', value)}
            error={errors.customerContact}
            widthClass="w-60"
          />
        </FormItem>
        <FormItem label="配達" htmlFor="deliveryMethodId" fromIntake={fromIntake('deliveryMethodId')}>
          <DeliveryFields header={header} navigation={navigation} options={masters.deliveryMethods} />
        </FormItem>

        <FormItem label="工事名" htmlFor="projectName" className="col-span-2" fromIntake={fromIntake('projectName')}>
          <TextField
            {...navigation.fieldProps('projectName')}
            value={values.projectName}
            onValueChange={(value) => setValue('projectName', value)}
            error={errors.projectName}
            widthClass="w-full"
          />
        </FormItem>

        <FormItem
          label="入れ先（納入先）"
          htmlFor="deliveryDestinationId"
          className="col-span-2"
          note="0 は売り先と同じ ／ / の一覧の先頭は受付の入れ先"
          fromIntake={fromIntake('deliveryDestinationId')}
        >
          <CodeField
            {...navigation.fieldProps('deliveryDestinationId')}
            listTitle="入れ先"
            options={destinationOptions}
            maxLength={CODE_LENGTHS.destination}
            searchable
            code={values.deliveryDestinationId}
            onCodeChange={(code) => setValue('deliveryDestinationId', code)}
            error={errors.deliveryDestinationId}
            codeWidthClass="w-20"
            nameWidthClass="w-96"
          />
        </FormItem>

        <FormItem label="加工場所" htmlFor="siteId" className="col-span-2" fromIntake={fromIntake('siteId')}>
          <CodeChipsField
            {...navigation.fieldProps('siteId')}
            listTitle="加工場所"
            options={masters.sites}
            maxLength={CODE_LENGTHS.site}
            code={values.siteId}
            onCodeChange={(code) => setValue('siteId', code)}
            error={errors.siteId}
          />
          {header.siteChangedFromIntake && (
            <p className="text-xs font-semibold text-attention">
              受付の加工場所から変えています。登録すると受付の加工場所も変わり、この受付の残りの区分は変更先の受注登録待ちに移ります
            </p>
          )}
        </FormItem>

        <FormItem
          label="部材区分"
          htmlFor="memberClass"
          className="col-span-2"
          note="部品ごとに受注を分けるときに選択（4 SPL はスプライス専用の受注）"
        >
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            <CodeChipsField
              {...navigation.fieldProps('memberClass')}
              listTitle="部材区分"
              options={MEMBER_CLASS_OPTIONS}
              maxLength={CODE_LENGTHS.memberClass}
              code={values.memberClass}
              onCodeChange={(code) => setValue('memberClass', code)}
              error={errors.memberClass}
            />
            {/* 部材区分が SPL（スプライス専用の受注）のときだけ、継手番号とショットを出す */}
            {header.isSplice && <SpliceFields header={header} navigation={navigation} />}
          </div>
        </FormItem>
      </div>
    </section>
  )
}
