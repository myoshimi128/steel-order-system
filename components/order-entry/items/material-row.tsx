'use client'

// 明細の材料の行（1 件 1 行）。docs/screen-design.md「明細の表（1 件 1 行）」。
//
//   | No | 切断・区分 | 種類 | 材質 | 製鋼法 | メーカー | 品名・寸法 | 数量 | 重量 |
//
// 種類・製鋼法・メーカーも常に列として見せ、初期値と違う値は強調する（見落とし防止）。
// 入力値と行の操作は useOrderItems、計算は useItemCalculations、行の中のキー操作は
// useItemRowKeyboard が担当し、この部品は並べて表示するだけにする。
// 欄が狭いため、エラーは欄の枠の色で示し、文章は行の下（RowMessages）にまとめて出す。

import { CodeField } from '@/components/code-input/code-field'
import { NumericField } from '@/components/code-input/numeric-field'
import type { CodeOption } from '@/lib/code-input/code-option'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import type { ItemCalculation } from '@/lib/order-entry/calculate-item'
import { COPY_ROW_COMMAND_KEY, PROCESS_REGION_CODE, STEEL_MAKING_OPTIONS } from '@/lib/order-entry/constants'
import type { RowEmphasis } from '@/lib/order-entry/emphasis'
import { manufacturerOptionsFor, materialOptionsFor } from '@/lib/order-entry/item-options'
import { firstItemFieldId, itemFieldId } from '@/lib/order-entry/item-row'
import type { ItemErrors, ItemFieldName, ItemMasters } from '@/lib/order-entry/item-types'
import { useItemRowKeyboard } from '@/lib/order-entry/use-item-row-keyboard'
import type { OrderItemsState } from '@/lib/order-entry/use-order-items'
import type { ItemRowCheck } from '@/lib/order-entry/validate-order-items'
import { DimensionFields } from './dimension-fields'
import { ITEM_GRID_CLASS } from './item-grid'
import { NotApplicable } from './not-applicable'
import { RowMessages } from './row-messages'

type MaterialRowProps = {
  index: number
  // No 欄に出す材料の行の番号（加工の行は数えない）
  number: number
  items: OrderItemsState
  check: ItemRowCheck
  calculation: ItemCalculation
  // 単価を計算できなかった理由（価格マスタの取得に失敗したなど）。単価は画面に出さないため、行の下に出す
  pricingError?: string
  errors: ItemErrors
  masters: ItemMasters
  // 初期値と違う値の欄（強調する）
  emphasis: RowEmphasis
  cutRegionOptions: readonly CodeOption<string>[]
  plateTypeOptions: readonly CodeOption<string>[]
  // 明細の入力を終えたときに移る欄の ID（スタンプの番号の欄）
  finishFieldId: string
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
  emphasis,
  cutRegionOptions,
  plateTypeOptions,
  finishFieldId,
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

  // 次の行の先頭へ移る。最後の行なら行を追加してから移る
  function moveToNextRow() {
    if (isLastRow) {
      navigation.focusFieldLater(itemFieldId(items.appendRow(), 'cutRegion'))
      return
    }
    navigation.focusFieldLater(firstItemFieldId(items.rows[index + 1]))
  }

  // 切断・区分の欄の Enter（2 桁を打ったとき・「9」を打ったときは自動で呼ばれる）。
  //   ・「9」なら加工の行に切り替わるため、同じ位置に出る加工方法の欄へ移る
  //   ・何も入力していない最後の行なら、明細の入力を終えたとしてスタンプの番号の欄へ移る
  // 自動で呼ばれたときは行の状態がまだ更新されていないため、確定した番号を引数で受け取る
  function handleCutRegionNext(typed: string) {
    const code = typed.trim()
    if (code === PROCESS_REGION_CODE) {
      navigation.focusFieldLater(itemFieldId(row.key, 'processType'))
      return
    }
    if (isLastRow && index > 0 && !code) {
      navigation.focusFieldLater(finishFieldId)
      return
    }
    navigation.focusNext(itemFieldId(row.key, 'cutRegion'))
  }

  // 切断・区分の欄の「-」→ 行番号 → Enter。その番号の材料の行を、加工の行ごと今の行に写す
  function copyFromRowNumber(digits: string) {
    if (!digits) {
      onNotice('複写する行番号を打ってから Enter を押してください')
      return
    }
    const result = items.copyRow(row.key, Number(digits))
    if (!result.ok) {
      onNotice(result.message)
      // 写せなかったときは、打った「-」と行番号を消す
      setField('cutRegion', '')
    }
  }

  const plateTypeId = resolved.plateType?.id ?? null
  const hasErrors = Object.keys(errors).length > 0

  return (
    <div
      onKeyDown={handleRowKeyDown}
      className={`border-b border-line py-1 text-[13px] ${hasErrors ? 'bg-red-50' : ''}`}
    >
      <div className={`${ITEM_GRID_CLASS} items-center`}>
        {/* No */}
        <div className="text-center text-neutral-500 tabular-nums">{number}</div>

        {/* 切断・区分（2 桁の番号） */}
        <CodeField
          {...fieldProps('cutRegion')}
          onNext={handleCutRegionNext}
          listTitle="切断・区分"
          options={cutRegionOptions}
          maxLength={CODE_LENGTHS.cutRegion}
          command={{ key: COPY_ROW_COMMAND_KEY, onSubmit: copyFromRowNumber }}
          code={row.cutRegion}
          onCodeChange={(code) => setField('cutRegion', code)}
          error={errors.cutRegion}
          codeWidthClass="w-7"
          nameWidthClass="w-24"
          dense
          showErrorText={false}
        />

        {/* 種類 */}
        <CodeField
          {...fieldProps('plateType')}
          listTitle="種類"
          options={plateTypeOptions}
          maxLength={CODE_LENGTHS.plateType}
          code={row.plateType}
          onCodeChange={(code) => setField('plateType', code)}
          error={errors.plateType}
          codeWidthClass="w-6"
          nameWidthClass="w-[2.875rem]"
          dense
          emphasized={emphasis.plateType}
          showErrorText={false}
        />

        {/* 材質（材質のない種類＝ボンデ・ミガキは「—」） */}
        {resolved.needsMaterial ? (
          <CodeField
            {...fieldProps('material')}
            listTitle={`材質（${resolved.plateType?.name ?? ''}）`}
            options={materialOptionsFor(plateTypeId, masters)}
            maxLength={CODE_LENGTHS.material}
            code={row.material}
            onCodeChange={(code) => setField('material', code)}
            error={errors.material}
            codeWidthClass="w-6"
            nameWidthClass="w-[3.875rem]"
            dense
            emphasized={emphasis.material}
            showErrorText={false}
          />
        ) : (
          <NotApplicable />
        )}

        {/* 製鋼法（定尺・縞板などでは「—」） */}
        {resolved.steelMakingApplicable ? (
          <CodeField
            {...fieldProps('steelMaking')}
            listTitle="製鋼法"
            options={STEEL_MAKING_OPTIONS}
            maxLength={CODE_LENGTHS.steelMaking}
            code={row.steelMaking}
            onCodeChange={(code) => setField('steelMaking', code)}
            error={errors.steelMaking}
            codeWidthClass="w-6"
            nameWidthClass="w-[2.375rem]"
            dense
            emphasized={emphasis.steelMaking}
            showErrorText={false}
          />
        ) : (
          <NotApplicable />
        )}

        {/* メーカー（長い名前は省略し、マウスを乗せると全体を表示する） */}
        <CodeField
          {...fieldProps('manufacturer')}
          listTitle="メーカー"
          options={manufacturerOptionsFor(plateTypeId, masters)}
          maxLength={CODE_LENGTHS.manufacturer}
          code={row.manufacturer}
          onCodeChange={(code) => setField('manufacturer', code)}
          error={errors.manufacturer}
          codeWidthClass="w-8"
          nameWidthClass="w-[2.375rem]"
          dense
          emphasized={emphasis.manufacturer}
          showErrorText={false}
        />

        {/* 品名・寸法（板厚 × 区分に応じた寸法） */}
        <DimensionFields
          kind={resolved.dimensionKind}
          row={row}
          errors={errors}
          fieldProps={fieldProps}
          onChange={setField}
        />

        {/* 数量。数量の後の Enter は次の行へ（最後の行なら行を追加する） */}
        <NumericField
          {...fieldProps('quantity')}
          onNext={moveToNextRow}
          value={row.quantity}
          onValueChange={(value) => setField('quantity', value)}
          error={errors.quantity}
          widthClass="w-full"
          dense
          showErrorText={false}
        />

        {/* 重量（自動計算。単価とは切り離して、寸法などがそろえば出す） */}
        <span className="rounded bg-neutral-100 px-1 py-1 text-right tabular-nums">
          {result.weight ? result.weight.totalWeight.toFixed(2) : ''}
        </span>

        <RowMessages errors={errors} extra={pricingError ? [pricingError] : []} />
      </div>
    </div>
  )
}
