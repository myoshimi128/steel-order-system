// 受注の保存用のデータ（DB の関数 create_order に渡す JSON）を組み立てる。
//
// 列名は orders・order_items の列名に合わせる（create_order が列名をキーにして取り出すため）。
// サーバー（Server Action）で、確認と計算を済ませた後に使う。

import { roundTo } from '@/lib/pricing/rounding'
import type { ItemCalculation } from './calculate-item'
import type { ResolvedItem } from './resolve-item'
import type { OrderHeaderInput } from './validate-order-header'

// 空文字は NULL として保存する（任意項目の未入力）
function nullIfEmpty(value: string): string | null {
  return value.trim() === '' ? null : value.trim()
}

// 重量の保存値。浮動小数点の誤差（1.4130000000000003 など）を取り除くため、小数第 6 位で丸める
// （単価の判定は丸める前の値で済ませており、保存する値は表示・集計に使う）
function weightValue(value: number | null): number | null {
  return value === null ? null : roundTo(value, 6)
}

export function buildOrderPayload(
  input: OrderHeaderInput,
  deliveryMethodRequiresNote: boolean,
) {
  return {
    order_date: input.orderDate,
    is_splice: input.isSplice,
    // 通常の受注では継手番号・ショットを保存しない（orders_splice_columns_check）
    joint_no: input.isSplice ? input.jointNo.trim() : null,
    splice_shot: input.isSplice ? input.spliceShot : null,
    customer_id: input.customerId,
    customer_contact: nullIfEmpty(input.customerContact),
    delivery_destination_id: input.deliveryDestinationId,
    project_name: nullIfEmpty(input.projectName),
    due_date_type: input.dueDateType,
    // 後報・最短出荷は日付を持たない
    due_date: nullIfEmpty(input.dueDate),
    delivery_method_id: input.deliveryMethodId,
    delivery_method_note: deliveryMethodRequiresNote ? nullIfEmpty(input.deliveryMethodNote) : null,
  }
}

// 明細 1 行分。計算が終わっていない行（incomplete・loading）は保存できないため null を返す
export function buildOrderItemPayload(
  item: ResolvedItem,
  calculation: ItemCalculation,
  lineNo: number,
  fieldNote: string,
) {
  if (
    calculation.status === 'incomplete' ||
    calculation.status === 'loading' ||
    !item.productSelection?.ok ||
    !item.region
  ) {
    return null
  }
  const { region, dimensionKind, dimensions } = item
  const { weights } = calculation
  const isRectangle = dimensionKind === 'rectangle'
  const isCircle = dimensionKind === 'circle' || dimensionKind === 'donut'

  return {
    line_no: lineNo,
    product_id: item.productSelection.product.id,
    // 定尺売りは切断を伴わないため、切断方法は NULL
    cutting_method: item.cuttingMethod === '定尺' ? null : item.cuttingMethod,
    // 切断区分は通常の切断（寸法切・アイトレ）だけ。定尺売り・特殊製品は NULL
    cutting_type: region.kind === 'cut' ? region.cuttingType : null,
    special_product_type_id: region.kind === 'special' ? region.type.id : null,
    plate_size: region.kind === 'standard' ? item.plateSize : null,
    // 製鋼法を入力しない行（定尺売り・縞板など）は NULL
    steel_making: item.steelMaking,
    width: isRectangle ? dimensions.width : null,
    length: isRectangle ? dimensions.length : null,
    outer_diameter: isCircle ? dimensions.outerDiameter : null,
    inner_diameter: dimensionKind === 'donut' ? dimensions.innerDiameter : null,
    quantity: item.quantity,
    square_weight: weightValue(weights.squareWeight),
    actual_weight: weightValue(weights.actualWeight),
    material_weight: weightValue(weights.materialWeight),
    // 別途見積もりは仕入単価を空欄（NULL）のまま登録し、受注の修正で後から入力する
    cutting_unit_price: calculation.status === 'priced' ? calculation.unitPrice : null,
    price_unit: calculation.status === 'priced' ? calculation.priceUnit : null,
    manufacturer_specified_id: item.manufacturerId,
    field_note: nullIfEmpty(fieldNote),
  }
}

export type OrderItemPayload = NonNullable<ReturnType<typeof buildOrderItemPayload>>
