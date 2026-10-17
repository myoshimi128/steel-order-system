'use client'

// ③ 伝票の指示の「摘要」の一覧（docs/screen-design.md「③ 伝票の指示」）。
// ② で入力した明細を、どの行か分かる程度（切断・区分・材質・品名・寸法・数量）に並べ、
// その横に摘要の入力欄を置く。明細の内容はここでは変えられない（変えるときは ② に戻る）。
// 何も入力していない行は保存しないため、一覧にも出さない。
// Enter で次の行の摘要へ進み、最後の行の後はスタンプの番号の欄へ進む（入力順は親が決める）。

import { TextField } from '@/components/code-input/text-field'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { itemFieldId } from '@/lib/order-entry/item-row'
import type { FieldNoteRow } from '@/lib/order-entry/field-note-rows'
import type { OrderItemsState } from '@/lib/order-entry/use-order-items'

type FieldNoteListProps = {
  rows: readonly FieldNoteRow[]
  items: OrderItemsState
  navigation: FieldNavigation
}

export function FieldNoteList({ rows, items, navigation }: FieldNoteListProps) {
  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 z-10 bg-canvas text-xs text-neutral-600">
          <tr>
            <th className="w-8 py-2 font-semibold">
              <span className="sr-only">No</span>
            </th>
            <th className="w-32 py-2 text-left font-semibold">切断・区分</th>
            <th className="w-24 py-2 text-left font-semibold">材質</th>
            <th className="w-44 py-2 text-left font-semibold">品名・寸法</th>
            <th className="w-14 py-2 text-right font-semibold">数量</th>
            <th className="py-2 pl-3 text-left font-semibold">摘要</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={`border-b border-line ${row.isProcess ? 'bg-canvas/60' : ''}`}>
              <td className="py-1 text-center text-neutral-500 tabular-nums">{row.number}</td>
              <td className="truncate py-1">{row.cutRegion}</td>
              <td className="truncate py-1">{row.material}</td>
              <td className="truncate py-1 tabular-nums">{row.dimensions}</td>
              <td className="py-1 text-right tabular-nums">{row.quantity}</td>
              <td className="py-1 pl-3">
                <TextField
                  {...navigation.fieldProps(itemFieldId(row.key, 'fieldNote'))}
                  value={items.rows.find((item) => item.key === row.key)?.fieldNote ?? ''}
                  onValueChange={(value) => items.setField(row.key, 'fieldNote', value)}
                  widthClass="w-full"
                  showErrorText={false}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
