'use client'

// ① 受注情報の入力欄（docs/screen-design.md「① 受注情報」、画面イメージ S-06c の形）。
//
//   ┌ 受付No.（受付と連携後に表示）        ┐┌ 受注No.（登録時に採番）              ┐  ← 上部の帯
//   │ 処理区分                │ 受注日                          │
//   │ 売り先 *                │ 納期（種別＋日付）               │
//   │ 客先担当                │ 配達（フリーのときは文字の欄）    │
//   │ 工事名                                                    │
//   │ 入れ先                                                    │
//   │ 加工場所（1 本社 / 2 A営業所 / 3 B営業所）                 │
//   │ 部材区分（1 DF / 2 GPL / 3 BH / 4 SPL / 0 無分類）＋ SPL のときは継手番号・ショット │
//
// 項目名は欄の上に置く（FormItem）。加工場所・部材区分は選択肢をボタン状に並べて見せる（CodeChipsField）。
// 入力値と表示の切り替えは useOrderHeader、欄の移動は useFieldNavigation が管理し、
// この部品は並べて表示するだけにする。

import { CodeField } from '@/components/code-input/code-field'
import { DateField } from '@/components/code-input/date-field'
import { TextField } from '@/components/code-input/text-field'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { MEMBER_CLASS_OPTIONS, PROCESSING_TYPE_OPTIONS } from '@/lib/order-entry/constants'
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
}

export function OrderHeader({ header, navigation, masters, today }: OrderHeaderProps) {
  const { values, errors, setValue } = header

  return (
    <section className="flex flex-col">
      {/* 上部の帯: 受付No. と 受注No.（どちらも表示のみ） */}
      <div className="grid grid-cols-2 gap-6 border-b border-line bg-navy-soft/60 px-6 py-4">
        <FormItem label="受付No." note="受付と連携後に表示">
          {/* 受付のテーブルができたら、受注登録待ちの一覧で選んだ受付の番号を出す */}
          <div className="rounded border border-line bg-white px-4 py-2 text-xl font-bold tracking-widest text-neutral-300">
            — — — —
          </div>
        </FormItem>
        <FormItem label="受注No." note="自動採番">
          {/* 今の番号の形（年 2 桁＋連番）で登録時に採番する。受付ができたら受付No.＋枝番に変える */}
          <div className="px-1 py-2 text-xl font-bold text-navy">登録時に採番</div>
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

        <FormItem label="売り先" htmlFor="customerId" required note="コード入力 ／ / か End で一覧">
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
        <FormItem label="納期" htmlFor="dueDateType">
          <DueDateFields header={header} navigation={navigation} today={today} />
        </FormItem>

        <FormItem label="客先担当" htmlFor="customerContact">
          <TextField
            {...navigation.fieldProps('customerContact')}
            value={values.customerContact}
            onValueChange={(value) => setValue('customerContact', value)}
            error={errors.customerContact}
            widthClass="w-60"
          />
        </FormItem>
        <FormItem label="配達" htmlFor="deliveryMethodId">
          <DeliveryFields header={header} navigation={navigation} options={masters.deliveryMethods} />
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

        <FormItem label="入れ先（納入先）" htmlFor="deliveryDestinationId" className="col-span-2" note="0 は売り先と同じ">
          <CodeField
            {...navigation.fieldProps('deliveryDestinationId')}
            listTitle="入れ先"
            options={masters.destinations}
            maxLength={CODE_LENGTHS.destination}
            searchable
            code={values.deliveryDestinationId}
            onCodeChange={(code) => setValue('deliveryDestinationId', code)}
            error={errors.deliveryDestinationId}
            codeWidthClass="w-20"
            nameWidthClass="w-96"
          />
        </FormItem>

        <FormItem
          label="加工場所"
          htmlFor="siteId"
          className="col-span-2"
          note="受付と連携後は受付の加工場所が入ります"
        >
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
