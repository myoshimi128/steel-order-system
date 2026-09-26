// 明細金額の計算。円未満は切り上げる。
//
//   枚単価: 枚単価 × 枚数
//   kg単価: kg単価 × 合計重量（1枚あたりの重量 × 枚数 を小数第2位までに四捨五入した値）
//
// kg単価の金額に合計重量（丸めた後の値）を使うのは、伝票に印字される重量と
// 単価から電卓で検算したときに金額が一致するようにするため。

import { ceilToYen } from './rounding'
import { calcTotalWeight } from './weight'

export function calcAmount(
  price: {
    priceUnit: 'kg' | '枚'
    unitPrice: number
    // 単価の根拠にした1枚あたりの重量（丸める前の値）
    billingWeight: number
  },
  quantity: number,
): number {
  if (price.priceUnit === '枚') {
    return ceilToYen(price.unitPrice * quantity)
  }
  return ceilToYen(price.unitPrice * calcTotalWeight(price.billingWeight, quantity))
}
