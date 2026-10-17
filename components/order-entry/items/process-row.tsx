'use client'

// 明細の加工の行（1 件 1 行）。直上の材料の行（母材）にぶら下がる（docs/screen-design.md「加工の行」）。
//
//   | └ | 加工 ＋ 加工方法（切断・区分〜製鋼法の 4 列） | 加工の項目（メーカー〜品名・寸法の 2 列） | 数量 | （重量なし） |
//
// 切断・区分で「9」を打つと加工の行になり、同じ位置が加工方法の番号の欄に変わる。
// 加工の項目の入力欄は、加工種別の入力の形（自由入力 / 穴 / 曲げ）で切り替える（process-shapes/）。
// 穴・曲げの数量は母材の枚数から自動で求め、グレーで表示する。
// 単位・仕入単価は受注登録の画面では入力しない（仕入入力で扱う）。摘要は ③ 伝票の指示で入力する。
// 入力順: 加工方法 → 加工の項目 → 数量（自由入力のみ）。行の最後の欄の後は次の行へ

import { CodeField } from '@/components/code-input/code-field'
import { NumericField } from '@/components/code-input/numeric-field'
import type { CodeOption } from '@/lib/code-input/code-option'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { firstItemFieldId, itemFieldId } from '@/lib/order-entry/item-row'
import type { ItemErrors, ItemFieldName } from '@/lib/order-entry/item-types'
import type { ProcessNoticeMaster } from '@/lib/order-entry/notices'
import type { ResolvedProcess } from '@/lib/order-entry/process-row'
import { useItemRowKeyboard } from '@/lib/order-entry/use-item-row-keyboard'
import type { OrderItemsState } from '@/lib/order-entry/use-order-items'
import { ITEM_GRID_CLASS } from './item-grid'
import { ProcessSpecFields } from './process-shapes/process-spec-fields'
import { RowMessages } from './row-messages'

type ProcessRowProps = {
  index: number
  items: OrderItemsState
  // 行の解釈結果（入力の形・自動で求めた数量）
  resolved: ResolvedProcess
  // この行に当てはまる加工の注意事項（表示のみ。登録は止めない）
  notices: readonly ProcessNoticeMaster[]
  errors: ItemErrors
  processTypeOptions: readonly CodeOption<string>[]
  // この行の入力順の最後の欄の ID（その欄の Enter で次の行へ移る）
  lastFieldId: string
  navigation: FieldNavigation
  onNotice: (message: string) => void
}

export function ProcessRow({
  index,
  items,
  resolved,
  notices,
  errors,
  processTypeOptions,
  lastFieldId,
  navigation,
  onNotice,
}: ProcessRowProps) {
  const row = items.rows[index]
  const isLastRow = index === items.rows.length - 1
  const handleRowKeyDown = useItemRowKeyboard({ rowKey: row.key, items, navigation, onNotice })
  const setField = (field: ItemFieldName, value: string) => items.setField(row.key, field, value)

  // 次の行の先頭へ移る。最後の行なら材料の行を追加してから移る
  function moveToNextRow() {
    if (isLastRow) {
      navigation.focusFieldLater(itemFieldId(items.appendRow(), 'cutRegion'))
      return
    }
    navigation.focusFieldLater(firstItemFieldId(items.rows[index + 1]))
  }

  // 欄の props。行の最後の欄だけ、Enter で次の行へ移るようにする
  // （行の最後の欄は入力の形で変わるため、親から ID を受け取って判定する）
  const fieldProps = (field: ItemFieldName) => {
    const id = itemFieldId(row.key, field)
    const props = navigation.fieldProps(id)
    return id === lastFieldId ? { ...props, onNext: moveToNextRow } : props
  }

  // 加工方法の欄で、空のまま Shift+Enter を押したら、材料の行の「切断・区分」に戻す（加工の行をやめる）
  function handleProcessTypePrevious() {
    if (!row.processType.trim()) {
      setField('cutRegion', '')
      navigation.focusFieldLater(itemFieldId(row.key, 'cutRegion'))
      return
    }
    navigation.focusPrevious(itemFieldId(row.key, 'processType'))
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div
      onKeyDown={handleRowKeyDown}
      className={`border-b border-line py-1 text-[13px] ${hasErrors ? 'bg-red-50' : 'bg-canvas/60'}`}
    >
      <div className={`${ITEM_GRID_CLASS} items-center`}>
        {/* No: 母材にぶら下がることを示す */}
        <div className="text-center text-neutral-400">└</div>

        {/* 「加工」の印と加工方法（切断・区分〜製鋼法の 4 列分） */}
        <div className="col-span-4 flex items-center gap-1.5">
          <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs text-neutral-700">9 加工</span>
          <CodeField
            {...fieldProps('processType')}
            onPrevious={handleProcessTypePrevious}
            listTitle="加工方法"
            options={processTypeOptions}
            code={row.processType}
            onCodeChange={(code) => setField('processType', code)}
            error={errors.processType}
            codeWidthClass="w-8"
            nameWidthClass="w-36"
            dense
            showErrorText={false}
          />
        </div>

        {/* 加工の項目（メーカー〜品名・寸法の 2 列分）。加工種別の入力の形で入力欄を切り替える */}
        <div className="col-span-2 min-w-0">
          <ProcessSpecFields
            shape={resolved.shape}
            row={row}
            errors={errors}
            fieldProps={fieldProps}
            onChange={setField}
          />
        </div>

        {/* 数量。穴・曲げは母材の枚数から自動で求めるため、グレーの表示にして入力させない */}
        {resolved.quantityAutomatic ? (
          <span className="rounded bg-neutral-100 px-1 py-1 text-right tabular-nums">
            {/* 母材の枚数がまだ入力されていなければ「—」 */}
            {resolved.quantity?.toLocaleString('ja-JP') ?? '—'}
          </span>
        ) : (
          <NumericField
            {...fieldProps('quantity')}
            value={row.quantity}
            onValueChange={(value) => setField('quantity', value)}
            error={errors.quantity}
            widthClass="w-full"
            dense
            showErrorText={false}
          />
        )}

        {/* 重量の列（加工の行は重量を持たない） */}
        <span />

        <RowMessages errors={errors} />

        {/* 加工の注意事項（例: 穴径 30φ 以上のキリ孔 →「精度注意」）。エラーと区別するため色を変える */}
        {notices.length > 0 && (
          <ul className="col-span-full pl-8 pt-1 text-xs text-attention">
            {notices.map((notice) => (
              <li key={notice.id}>注意: {notice.body}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
