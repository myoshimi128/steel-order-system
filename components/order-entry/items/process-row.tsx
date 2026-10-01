'use client'

// 明細の加工の行（1 段）。直上の材料の行（母材）にぶら下がる（docs/screen-design.md「加工の行（1 段）」）。
//
//   | └ | 区分 | 加工方法（種類〜材質の位置） | 加工内容（品名の位置） | 数量 | 単位・仕入単価 | 摘要 |
//
// 数量・仕入単価・摘要は、材料の行と縦の位置を揃える（同じ列の幅 ITEM_GRID_CLASS を使う）。
// 切断方法は表示しない（1 段に収めるため。加工の行の切断方法は母材のもの）。
// 入力順: 区分 → 加工方法 → 加工内容 → 数量 → 単位 → 仕入単価（仕入単価の後は次の行へ）

import { CodeField } from '@/components/code-input/code-field'
import { NumericField } from '@/components/code-input/numeric-field'
import { TextField } from '@/components/code-input/text-field'
import type { CodeOption } from '@/lib/code-input/code-option'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { PROCESS_PRICE_UNIT_OPTIONS } from '@/lib/order-entry/constants'
import { firstItemFieldId, itemFieldId } from '@/lib/order-entry/item-row'
import type { ItemErrors, ItemFieldName } from '@/lib/order-entry/item-types'
import type { ProcessCalculation } from '@/lib/order-entry/process-row'
import { useItemRowKeyboard } from '@/lib/order-entry/use-item-row-keyboard'
import type { OrderItemsState } from '@/lib/order-entry/use-order-items'
import { ITEM_GRID_CLASS } from './item-grid'
import { RowMessages } from './row-messages'

type ProcessRowProps = {
  index: number
  items: OrderItemsState
  calculation: ProcessCalculation
  errors: ItemErrors
  // スプライス専用の受注か（区分の一覧の見出しが「切断区分」になる）
  isSplice: boolean
  regionOptions: readonly CodeOption<string>[]
  processTypeOptions: readonly CodeOption<string>[]
  navigation: FieldNavigation
  onNotice: (message: string) => void
}

// 仕入金額の表示（加工の行は 1 段のため、仕入単価の欄の右下に小さく出す）
function amountText(calculation: ProcessCalculation): string {
  if (calculation.status === 'priced') {
    return calculation.amount.toLocaleString('ja-JP')
  }
  if (calculation.status === 'unpriced') {
    return '単価未定'
  }
  return ''
}

export function ProcessRow({
  index,
  items,
  calculation,
  errors,
  isSplice,
  regionOptions,
  processTypeOptions,
  navigation,
  onNotice,
}: ProcessRowProps) {
  const row = items.rows[index]
  const isLastRow = index === items.rows.length - 1
  const handleRowKeyDown = useItemRowKeyboard({ rowKey: row.key, items, navigation, onNotice })

  const fieldProps = (field: ItemFieldName) => navigation.fieldProps(itemFieldId(row.key, field))
  const setField = (field: ItemFieldName, value: string) => items.setField(row.key, field, value)

  // 次の行の先頭へ移る。最後の行なら材料の行を追加してから移る
  function moveToNextRow() {
    if (isLastRow) {
      navigation.focusFieldLater(itemFieldId(items.appendRow(), 'cuttingMethod'))
      return
    }
    navigation.focusFieldLater(firstItemFieldId(items.rows[index + 1]))
  }

  const hasMessages = Object.keys(errors).length > 0

  return (
    <div
      onKeyDown={handleRowKeyDown}
      className={`border-b border-neutral-100 py-1.5 text-sm dark:border-neutral-800 ${
        hasMessages ? 'bg-red-50 dark:bg-red-950/30' : 'bg-neutral-50/60 dark:bg-neutral-900/40'
      }`}
    >
      <div className={ITEM_GRID_CLASS}>
        {/* No: 母材にぶら下がることを示す */}
        <div className="flex items-center justify-center text-neutral-400">└</div>

        {/* 区分（9 加工） */}
        <CodeField
          {...fieldProps('region')}
          listTitle={isSplice ? '切断区分' : '区分'}
          options={regionOptions}
          code={row.region}
          onCodeChange={(code) => setField('region', code)}
          error={errors.region}
          codeWidthClass="w-9"
          nameWidthClass="w-[5.5rem]"
          showErrorText={false}
        />

        {/* 加工方法（種類〜材質の 2 列分） */}
        <div className="col-span-2">
          <CodeField
            {...fieldProps('processType')}
            listTitle="加工方法"
            options={processTypeOptions}
            code={row.processType}
            onCodeChange={(code) => setField('processType', code)}
            error={errors.processType}
            codeWidthClass="w-12"
            nameWidthClass="w-36"
            showErrorText={false}
          />
        </div>

        {/* 加工内容（品名の位置。文字で入力する） */}
        <div className="min-w-0">
          <TextField
            {...fieldProps('spec')}
            value={row.spec}
            onValueChange={(value) => setField('spec', value)}
            error={errors.spec}
            widthClass="w-full"
            showErrorText={false}
          />
        </div>

        {/* 数量 */}
        <NumericField
          {...fieldProps('quantity')}
          value={row.quantity}
          onValueChange={(value) => setField('quantity', value)}
          error={errors.quantity}
          widthClass="w-full"
          showErrorText={false}
        />

        {/* 単位（1 個 / 2 kg）と仕入単価（手入力。空欄は単価未定） */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1">
            <CodeField
              {...fieldProps('priceUnit')}
              listTitle="単位"
              options={PROCESS_PRICE_UNIT_OPTIONS}
              code={row.priceUnit}
              onCodeChange={(code) => setField('priceUnit', code)}
              error={errors.priceUnit}
              codeWidthClass="w-7"
              nameWidthClass="w-9"
              showErrorText={false}
            />
            <NumericField
              {...fieldProps('unitPrice')}
              // 仕入単価の後の Enter は次の行へ（最後の行なら行を追加する）
              onNext={moveToNextRow}
              value={row.unitPrice}
              onValueChange={(value) => setField('unitPrice', value)}
              error={errors.unitPrice}
              allowDecimal
              widthClass="w-[3.25rem]"
              showErrorText={false}
            />
          </div>
          <span className="text-[11px] tabular-nums text-neutral-500">{amountText(calculation)}</span>
        </div>

        {/* 摘要（「-」で移動する。Enter の順路には含めない） */}
        <div className="flex items-center">
          <TextField
            {...fieldProps('fieldNote')}
            onNext={moveToNextRow}
            onPrevious={() => navigation.focusField(itemFieldId(row.key, 'unitPrice'))}
            value={row.fieldNote}
            onValueChange={(value) => setField('fieldNote', value)}
            error={errors.fieldNote}
            widthClass="w-full"
            showErrorText={false}
          />
        </div>

        <RowMessages errors={errors} />
      </div>
    </div>
  )
}
