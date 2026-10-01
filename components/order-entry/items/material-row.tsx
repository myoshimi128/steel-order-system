'use client'

// 明細の材料の行（2 段）。1 つの欄に 2 つの値を上下に重ねる（docs/screen-design.md「材料の行（2 段）」）。
//
//   | No | 切断方法 | 種類   | 材質     | 品名              | 数量 | 仕入単価 | 摘要 |
//   |    | 区分     | 製鋼法 | メーカー | 区分名 と 寸法    | 重量 | 仕入金額 |      |
//
// 入力値と行の操作は useOrderItems、計算は useItemCalculations、行の中のキー操作は
// useItemRowKeyboard が担当し、この部品は並べて表示するだけにする。
// 欄が狭いため、エラーは欄の枠の色で示し、文章は行の下（RowMessages）にまとめて出す。

import { CodeField } from '@/components/code-input/code-field'
import { NumericField } from '@/components/code-input/numeric-field'
import { TextField } from '@/components/code-input/text-field'
import type { CodeOption } from '@/lib/code-input/code-option'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { CUTTING_METHOD_OPTIONS, STEEL_MAKING_OPTIONS } from '@/lib/order-entry/constants'
import type { ItemCalculation } from '@/lib/order-entry/calculate-item'
import { manufacturerOptionsFor, materialOptionsFor } from '@/lib/order-entry/item-options'
import { firstItemFieldId, itemFieldId } from '@/lib/order-entry/item-row'
import type { ItemErrors, ItemFieldName, ItemMasters } from '@/lib/order-entry/item-types'
import { buildProductName } from '@/lib/order-entry/product-name'
import { useItemRowKeyboard } from '@/lib/order-entry/use-item-row-keyboard'
import type { OrderItemsState } from '@/lib/order-entry/use-order-items'
import type { ItemRowCheck } from '@/lib/order-entry/validate-order-items'
import { DimensionFields } from './dimension-fields'
import { ITEM_GRID_CLASS } from './item-grid'
import { NotApplicable } from './not-applicable'
import { PriceCell } from './price-cell'
import { ProductName } from './product-name'
import { RowMessages } from './row-messages'

type MaterialRowProps = {
  index: number
  // No 欄に出す材料の行の番号（加工の行は数えない）
  number: number
  items: OrderItemsState
  check: ItemRowCheck
  calculation: ItemCalculation
  pricingError?: string
  errors: ItemErrors
  masters: ItemMasters
  // スプライス専用の受注か（区分の欄が切断区分になる）
  isSplice: boolean
  regionOptions: readonly CodeOption<string>[]
  plateTypeOptions: readonly CodeOption<string>[]
  navigation: FieldNavigation
  onNotice: (message: string) => void
}

export function MaterialRow({
  index,
  number,
  items,
  check,
  calculation: result,
  pricingError,
  errors,
  masters,
  isSplice,
  regionOptions,
  plateTypeOptions,
  navigation,
  onNotice,
}: MaterialRowProps) {
  const row = items.rows[index]
  const { resolved } = check
  const isLastRow = index === items.rows.length - 1
  const handleRowKeyDown = useItemRowKeyboard({ rowKey: row.key, items, navigation, onNotice })

  // 欄の ID（行の key と欄の名前）から、入力順の管理用の props を作る
  const fieldProps = (field: ItemFieldName) => navigation.fieldProps(itemFieldId(row.key, field))
  const setField = (field: ItemFieldName, value: string) => items.setField(row.key, field, value)

  // 次の行の先頭（材料の行は切断方法、加工の行は区分）へ移る。最後の行なら行を追加してから移る
  function moveToNextRow() {
    if (isLastRow) {
      navigation.focusFieldLater(itemFieldId(items.appendRow(), 'cuttingMethod'))
      return
    }
    navigation.focusFieldLater(firstItemFieldId(items.rows[index + 1]))
  }

  // 切断方法の欄の Enter: 何も入力していない最後の行なら、明細の入力を終えたとして登録ボタンへ移る
  function handleCuttingMethodNext() {
    const isBlankLastRow = isLastRow && index > 0 && !row.cuttingMethod.trim()
    if (isBlankLastRow) {
      navigation.focusField('submit')
      return
    }
    navigation.focusNext(itemFieldId(row.key, 'cuttingMethod'))
  }

  const plateTypeId = resolved.plateType?.id ?? null
  // 品名の下段に出す区分名。スプライス専用の受注の明細は「スプライス」と表示する
  const regionLabel =
    resolved.region?.kind === 'special' && resolved.region.type.is_splice_order_type
      ? resolved.region.type.name
      : (regionOptions.find((option) => option.code === row.region.trim())?.label ?? '')
  const hasMessages = Object.keys(errors).length > 0

  return (
    <div
      onKeyDown={handleRowKeyDown}
      className={`border-b border-neutral-200 py-1.5 text-sm dark:border-neutral-800 ${
        hasMessages ? 'bg-red-50 dark:bg-red-950/30' : ''
      }`}
    >
      <div className={ITEM_GRID_CLASS}>
        {/* No */}
        <div className="flex items-center justify-center text-neutral-500">{number}</div>

        {/* 切断方法 / 区分 */}
        <div className="flex flex-col gap-1">
          <CodeField
            {...fieldProps('cuttingMethod')}
            onNext={handleCuttingMethodNext}
            listTitle="切断方法"
            options={CUTTING_METHOD_OPTIONS}
            code={row.cuttingMethod}
            onCodeChange={(code) => setField('cuttingMethod', code)}
            error={errors.cuttingMethod}
            codeWidthClass="w-9"
            nameWidthClass="w-[5.5rem]"
            showErrorText={false}
          />
          <CodeField
            {...fieldProps('region')}
            // スプライス専用の受注では、区分の欄は切断区分（1 寸法切 / 2 アイトレ / 9 加工）になる
            listTitle={isSplice ? '切断区分' : '区分'}
            options={regionOptions}
            code={row.region}
            onCodeChange={(code) => setField('region', code)}
            error={errors.region}
            // 切断方法が定尺のときは区分も定尺に固定する
            disabled={resolved.cuttingMethod === '定尺'}
            codeWidthClass="w-9"
            nameWidthClass="w-[5.5rem]"
            showErrorText={false}
          />
        </div>

        {/* 種類 / 製鋼法 */}
        <div className="flex flex-col gap-1">
          <CodeField
            {...fieldProps('plateType')}
            listTitle="種類"
            options={plateTypeOptions}
            code={row.plateType}
            onCodeChange={(code) => setField('plateType', code)}
            error={errors.plateType}
            codeWidthClass="w-9"
            nameWidthClass="w-16"
            showErrorText={false}
          />
          {resolved.steelMakingApplicable ? (
            <CodeField
              {...fieldProps('steelMaking')}
              listTitle="製鋼法"
              options={STEEL_MAKING_OPTIONS}
              code={row.steelMaking}
              onCodeChange={(code) => setField('steelMaking', code)}
              error={errors.steelMaking}
              codeWidthClass="w-9"
              nameWidthClass="w-16"
              showErrorText={false}
            />
          ) : (
            <NotApplicable />
          )}
        </div>

        {/* 材質 / メーカー */}
        <div className="flex flex-col gap-1">
          {resolved.needsMaterial ? (
            <CodeField
              {...fieldProps('material')}
              listTitle={`材質（${resolved.plateType?.name ?? ''}）`}
              options={materialOptionsFor(plateTypeId, masters)}
              code={row.material}
              onCodeChange={(code) => setField('material', code)}
              error={errors.material}
              codeWidthClass="w-9"
              nameWidthClass="w-[6.5rem]"
              showErrorText={false}
            />
          ) : (
            <NotApplicable />
          )}
          <CodeField
            {...fieldProps('manufacturer')}
            listTitle="メーカー"
            options={manufacturerOptionsFor(plateTypeId, masters)}
            code={row.manufacturer}
            onCodeChange={(code) => setField('manufacturer', code)}
            error={errors.manufacturer}
            codeWidthClass="w-9"
            nameWidthClass="w-[6.5rem]"
            showErrorText={false}
          />
        </div>

        {/* 品名 / 区分名と寸法 */}
        <div className="flex min-w-0 flex-col gap-1">
          <ProductName name={buildProductName(resolved, masters)} />
          <DimensionFields
            kind={resolved.dimensionKind}
            regionLabel={regionLabel}
            row={row}
            errors={errors}
            fieldProps={fieldProps}
            onChange={setField}
          />
        </div>

        {/* 数量 / 重量 */}
        <div className="flex flex-col gap-1">
          <NumericField
            {...fieldProps('quantity')}
            // 数量の後の Enter は次の行へ（最後の行なら行を追加する）
            onNext={moveToNextRow}
            value={row.quantity}
            onValueChange={(value) => setField('quantity', value)}
            error={errors.quantity}
            widthClass="w-full"
            showErrorText={false}
          />
          <span className="flex h-[34px] items-center justify-end rounded bg-neutral-100 px-2 tabular-nums dark:bg-neutral-800">
            {/* 重量は単価と切り離して表示する（単価が未確定・別途見積もりでも、寸法などがそろえば出す） */}
            {result.weight ? result.weight.totalWeight.toFixed(2) : ''}
          </span>
        </div>

        {/* 仕入単価 / 仕入金額 */}
        <PriceCell price={result.price} pricingError={pricingError} />

        {/* 摘要（「-」で移動する。Enter の順路には含めない） */}
        <div className="flex items-center">
          <TextField
            {...fieldProps('fieldNote')}
            onNext={moveToNextRow}
            onPrevious={() => navigation.focusField(itemFieldId(row.key, 'quantity'))}
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
