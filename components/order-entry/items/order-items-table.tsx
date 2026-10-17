'use client'

// 受注明細の表（見出し＋材料の行・加工の行＋合計）。② 注文内容の画面の中心。
// 明細が 100 行を超えることもあるため、この部分だけをスクロールさせる。
// 行の種類（材料の行 / 加工の行）に応じて、MaterialRow と ProcessRow を出し分ける（どちらも 1 行）。

import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { rowEmphasis } from '@/lib/order-entry/emphasis'
import {
  cutRegionOptions,
  plateTypeOptions,
  processTypeOptions,
} from '@/lib/order-entry/item-options'
import { itemFieldOrder } from '@/lib/order-entry/item-row'
import { materialNumbers } from '@/lib/order-entry/item-structure'
import {
  processNoticeTargetOf,
  processNoticesFor,
  type ProcessNoticeMaster,
} from '@/lib/order-entry/notices'
import type { ItemContext, ItemMasters } from '@/lib/order-entry/item-types'
import type { ItemRowCalculation } from '@/lib/order-entry/use-item-calculations'
import type { OrderItemsState } from '@/lib/order-entry/use-order-items'
import { HeaderCell } from './header-cell'
import { ITEM_GRID_CLASS } from './item-grid'
import { MaterialRow } from './material-row'
import { OrderItemsTotals } from './order-items-totals'
import { ProcessRow } from './process-row'

type OrderItemsTableProps = {
  items: OrderItemsState
  calculations: readonly ItemRowCalculation[]
  totalWeight: number
  masters: ItemMasters
  // 加工の注意事項（当てはまる加工の行のすぐ下に出す）
  processNotices: readonly ProcessNoticeMaster[]
  // スプライス専用の受注か・ショットの有無（切断・区分の番号の解釈が変わる）
  context: ItemContext
  // 明細の入力を終えたときに移るボタンの ID（「次へ」）
  finishFieldId: string
  navigation: FieldNavigation
  onNotice: (message: string) => void
}

export function OrderItemsTable({
  items,
  calculations,
  totalWeight,
  masters,
  processNotices,
  context,
  finishFieldId,
  navigation,
  onNotice,
}: OrderItemsTableProps) {
  // 選択肢はマスタから作る（行ごとに作り直さないよう、表で 1 回だけ作る）
  const cutRegions = cutRegionOptions(masters, context.isSplice)
  const plateTypes = plateTypeOptions(masters)
  const processTypes = processTypeOptions(masters)
  // No 欄の番号（材料の行だけに 1 から振る）
  const numbers = materialNumbers(items.rows)
  // 数量の合計（材料の行だけ。加工の行の数量は孔数などで単位が違うため含めない）
  const totalQuantity = items.checks.reduce(
    (sum, check) => (check.kind === 'material' && check.resolved.quantity ? sum + check.resolved.quantity : sum),
    0,
  )

  return (
    // 見出し・明細の行・合計を 1 つのスクロールの枠に入れ、見出しは上端、合計は下端に固定する（sticky）。
    // 見出しや合計を枠の外に置くと、明細の行の側にだけスクロールバーの幅が入り、列の位置がずれるため。
    // scroll-pt / scroll-pb は、キー操作で欄を移ったときに、その欄が固定した見出し・合計の下に隠れないようにする余白
    <div className="scroll-thin min-h-0 flex-1 scroll-pt-12 scroll-pb-10 overflow-y-auto [scrollbar-gutter:stable]">
      {/* 見出し */}
      <div className={`${ITEM_GRID_CLASS} sticky top-0 z-10 border-b border-line bg-canvas py-2 text-xs font-semibold text-neutral-600`}>
        {/* No の列は見出しの文字を出さない。読み上げ用にだけ「No」を入れておく */}
        <div>
          <span className="sr-only">No</span>
        </div>
        <HeaderCell top="切断・区分" />
        <HeaderCell top="種類" />
        <HeaderCell top="材質" />
        <HeaderCell top="製鋼法" />
        <HeaderCell top="メーカー" />
        <HeaderCell top="品名・寸法" />
        <HeaderCell top="数量" />
        <HeaderCell top="重量(kg)" />
      </div>

      {/* スプライス専用の受注の案内 */}
      {context.isSplice && (
        <p className="border-b border-line bg-navy-soft px-3 py-1.5 text-xs text-navy">
          <span className="font-semibold">スプライス専用の受注</span>
          　明細はすべてスプライス。使える番号は 寸法切 11・21・31・41 ／ アイトレ 12・22・32・42（別途見積もり）／ 9 加工
        </p>
      )}

      {/* 明細の行 */}
      <div>
        {items.rows.map((row, index) => {
          const check = items.checks[index]
          const result = calculations[index]
          const errors = items.errorsOf(row.key, index)

          if (check.kind === 'process' && result.kind === 'process') {
            const order = itemFieldOrder(row, { needsMaterial: false, steelMakingApplicable: false }, masters, context)
            return (
              <ProcessRow
                key={row.key}
                index={index}
                items={items}
                resolved={check.resolved}
                // 母材の板厚・この行の穴径が条件に当てはまる加工の注意事項
                notices={processNoticesFor(
                  processNotices,
                  processNoticeTargetOf(items.rows, items.checks, index),
                )}
                errors={errors}
                processTypeOptions={processTypes}
                lastFieldId={order[order.length - 1]}
                navigation={navigation}
                onNotice={onNotice}
              />
            )
          }
          if (check.kind === 'material' && result.kind === 'material') {
            return (
              <MaterialRow
                key={row.key}
                index={index}
                number={numbers[index] ?? index + 1}
                items={items}
                check={check}
                calculation={result.calculation}
                pricingError={result.pricingError}
                errors={errors}
                masters={masters}
                emphasis={rowEmphasis(check.resolved, masters)}
                cutRegionOptions={cutRegions}
                plateTypeOptions={plateTypes}
                finishFieldId={finishFieldId}
                navigation={navigation}
                onNotice={onNotice}
              />
            )
          }
          return null
        })}
        {items.itemsError && <p className="px-3 py-2 text-sm text-urgent">{items.itemsError}</p>}
      </div>

      {/* 合計は枠の下端に固定する（明細が少なければ最後の行のすぐ下に出る） */}
      <div className="sticky bottom-0 z-10">
        <OrderItemsTotals totalQuantity={totalQuantity} totalWeight={totalWeight} />
      </div>
    </div>
  )
}
