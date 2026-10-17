// 注意事項の絞り込み（docs/basic-design.md「注意事項の表示」）。
//
// 注意事項は 2 種類あり、どちらも表示のみで受注には保存しない。
//   得意先の注意事項（notices）: 補助エリアの「得意先の注意事項」の枠に表示する。
//     得意先（必須）・切断方法・加工種別のうち、指定した条件がすべて受注に当てはまったら表示する。
//     切断方法と加工種別は、受注のどこかの行にあれば当てはまるとする。
//   加工の注意事項（process_notices）: 当てはまった加工の行のすぐ下に表示する。
//     加工種別（必須）と、板厚の範囲（母材の板厚）・穴径の範囲（入力の形が「穴」の行の穴径）で判定する。
// 受注に関係のない注意事項まで出すと読み飛ばされるため、条件に当てはまるものだけを出す。
// 画面に依存しない純粋な関数にしてテストで確認する。

import type { CuttingMethod } from '@/lib/pricing/types'
import { parentIndexOf } from './item-structure'
import type { ItemRowValues, ProcessTypeMaster } from './item-types'
import { parsePositiveNumber } from './resolve-item'
import type { RowCheck } from './validate-order-items'

// 得意先の注意事項の条件に使える切断方法（notices_cutting_method_check と同じ値。定尺売りは切断しないため含めない）
export const NOTICE_CUTTING_METHODS: readonly CuttingMethod[] = ['シャーリング', 'ガス', 'レーザー', 'プラズマ']

// --- マスタ（page.tsx でサーバーから取得して渡す） ---

// 得意先の注意事項（notices）
export type CustomerNoticeMaster = {
  id: string
  customer_id: string
  // 切断方法の条件（任意）
  cutting_method: CuttingMethod | null
  // 加工種別の条件（任意）
  process_type_id: string | null
  body: string
  // 表示順（小さいほど上）
  priority: number
}

// 加工の注意事項（process_notices）。範囲はどちらも「以上・以下」で、片方だけの指定もできる
export type ProcessNoticeMaster = {
  id: string
  process_type_id: string
  thickness_min: number | null
  thickness_max: number | null
  hole_diameter_min: number | null
  hole_diameter_max: number | null
  body: string
}

// ------------------------------------------------------------
// 得意先の注意事項
// ------------------------------------------------------------

// 受注に含まれる切断方法・加工種別（明細のどこかの行にあるもの）
export type OrderNoticeConditions = {
  customerId: string | null
  cuttingMethods: ReadonlySet<string>
  processTypeIds: ReadonlySet<string>
}

// 明細の確認の結果から、受注に含まれる切断方法・加工種別を集める。
// 定尺売りは切断を伴わないため、切断方法には含めない
export function orderNoticeConditions(
  customerId: string | null,
  checks: readonly RowCheck[],
): OrderNoticeConditions {
  const cuttingMethods = new Set<string>()
  const processTypeIds = new Set<string>()
  for (const check of checks) {
    if (check.kind === 'material') {
      const method = check.resolved.cuttingMethod
      if (method && method !== '定尺') {
        cuttingMethods.add(method)
      }
    } else if (check.resolved.processTypeId) {
      processTypeIds.add(check.resolved.processTypeId)
    }
  }
  return { customerId, cuttingMethods, processTypeIds }
}

// 画面に出す得意先の注意事項。label はどの条件で表示されたかの印（例: 得意先 × レーザー × キリ孔）
export type DisplayedNotice = { id: string; label: string; body: string }

// 指定した条件がすべて受注に当てはまる注意事項を返す。
// 並び順は表示順（priority）の小さい順、同じなら条件の少ない順（得意先だけ → 組み合わせ）
export function customerNoticesFor(
  notices: readonly CustomerNoticeMaster[],
  conditions: OrderNoticeConditions,
  processTypes: readonly ProcessTypeMaster[],
): DisplayedNotice[] {
  if (!conditions.customerId) {
    return []
  }
  const conditionCount = (notice: CustomerNoticeMaster) =>
    (notice.cutting_method ? 1 : 0) + (notice.process_type_id ? 1 : 0)

  return notices
    .filter(
      (notice) =>
        notice.customer_id === conditions.customerId &&
        (notice.cutting_method === null || conditions.cuttingMethods.has(notice.cutting_method)) &&
        (notice.process_type_id === null || conditions.processTypeIds.has(notice.process_type_id)),
    )
    .sort((a, b) => a.priority - b.priority || conditionCount(a) - conditionCount(b))
    .map((notice) => {
      const processTypeName = notice.process_type_id
        ? processTypes.find((type) => type.id === notice.process_type_id)?.name
        : undefined
      // 指定した条件を並べて印にする
      const label = ['得意先', notice.cutting_method, processTypeName]
        .filter((part): part is string => Boolean(part))
        .join(' × ')
      return { id: notice.id, label, body: notice.body }
    })
}

// ------------------------------------------------------------
// 加工の注意事項
// ------------------------------------------------------------

// 値が範囲（以上・以下）に入るか。範囲を指定していなければ当てはまる。
// 範囲を指定しているのに値が分からない（板厚・穴径が未入力）場合は、判定できないため当てはまらない
export function matchesRange(value: number | null, min: number | null, max: number | null): boolean {
  if (min === null && max === null) {
    return true
  }
  if (value === null) {
    return false
  }
  return (min === null || value >= min) && (max === null || value <= max)
}

// 加工の行の判定に使う値
export type ProcessNoticeTarget = {
  processTypeId: string | null
  // 母材（材料の行）の板厚
  thickness: number | null
  // 穴径（入力の形が「穴」の行だけ。それ以外は null）
  holeDiameter: number | null
}

// 明細の index 番目（加工の行）の判定に使う値を集める
export function processNoticeTargetOf(
  rows: readonly ItemRowValues[],
  checks: readonly RowCheck[],
  index: number,
): ProcessNoticeTarget {
  const check = checks[index]
  if (check.kind !== 'process') {
    return { processTypeId: null, thickness: null, holeDiameter: null }
  }
  const parentIndex = parentIndexOf(rows, index)
  const parent = parentIndex >= 0 ? checks[parentIndex] : undefined
  return {
    processTypeId: check.resolved.processTypeId,
    thickness: parent?.kind === 'material' ? parent.resolved.thickness : null,
    // 穴径は項目がそろう前（孔数が未入力など）でも、入力した時点で判定に使う
    holeDiameter: check.resolved.shape === '穴' ? parsePositiveNumber(rows[index].holeDiameter) : null,
  }
}

// 加工の行に当てはまる注意事項
export function processNoticesFor(
  notices: readonly ProcessNoticeMaster[],
  target: ProcessNoticeTarget,
): ProcessNoticeMaster[] {
  if (!target.processTypeId) {
    return []
  }
  return notices.filter(
    (notice) =>
      notice.process_type_id === target.processTypeId &&
      matchesRange(target.thickness, notice.thickness_min, notice.thickness_max) &&
      matchesRange(target.holeDiameter, notice.hole_diameter_min, notice.hole_diameter_max),
  )
}
