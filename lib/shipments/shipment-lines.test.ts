import { describe, expect, it } from 'vitest'
import {
  checkShipmentEntry,
  deliveryWeight,
  entryLine,
  initialEntryValues,
  lineWeights,
  pieceWeightFromTotal,
  remainingQuantity,
  sumShipmentWeights,
  totalRemaining,
} from './shipment-lines'
import type { ShipmentOrderItem } from './types'

// 寸法切の行（実重量は角重量と同じで、受注の明細にある）
const cut: ShipmentOrderItem = {
  id: 'cut',
  lineNo: 1,
  cuttingMethod: 'シャーリング',
  productName: 'SS400 寸法切 9 X 300 X 600',
  processes: [],
  orderedQuantity: 10,
  shippedQuantity: 4,
  billingPieceWeight: 12.717,
  actualPieceWeight: 12.717,
  lastInputPieceWeight: null,
}

// アイトレの行（実重量は送り状の画面で入力する）
const irregular: ShipmentOrderItem = {
  id: 'irregular',
  lineNo: 2,
  cuttingMethod: 'ガス',
  productName: 'SS400 アイトレ 12 X 500 X 500',
  processes: [],
  orderedQuantity: 3,
  shippedQuantity: 0,
  billingPieceWeight: 23.55,
  actualPieceWeight: null,
  lastInputPieceWeight: 18.4,
}

describe('残りの数量', () => {
  it('受注数量 − 出荷済み', () => {
    expect(remainingQuantity(cut)).toBe(6)
    expect(totalRemaining([cut, irregular])).toBe(9)
  })

  it('出荷済みが多くても 0 より小さくしない', () => {
    expect(remainingQuantity({ orderedQuantity: 2, shippedQuantity: 3 })).toBe(0)
  })
})

describe('initialEntryValues', () => {
  it('今回の数量は残り、実重量は前回の入力（入力する行だけ）', () => {
    expect(initialEntryValues([cut, irregular])).toEqual({
      cut: { quantity: '6', pieceWeight: '' },
      irregular: { quantity: '3', pieceWeight: '18.4' },
    })
  })
})

describe('重量', () => {
  it('角重量・実重量は 1 枚あたり × 枚数を小数第 2 位まで', () => {
    expect(lineWeights(cut, 6, null)).toEqual({ square: 76.3, actual: 76.3 })
  })

  it('実重量がない行は入力した値を使い、入れなければ null', () => {
    expect(lineWeights(irregular, 3, 18.4)).toEqual({ square: 70.65, actual: 55.2 })
    expect(lineWeights(irregular, 3, null)).toEqual({ square: 70.65, actual: null })
  })

  it('配送の重量は実重量。わからなければ角重量で代わりに数える', () => {
    expect(deliveryWeight({ square: 70.65, actual: 55.2 })).toEqual({ weight: 55.2, estimated: false })
    expect(deliveryWeight({ square: 70.65, actual: null })).toEqual({ weight: 70.65, estimated: true })
    expect(deliveryWeight({ square: null, actual: null })).toEqual({ weight: null, estimated: false })
  })

  it('合計は 0 枚の行を数えず、角重量で代わりに数えた行を数える', () => {
    const totals = sumShipmentWeights([
      { quantity: 6, weights: { square: 76.3, actual: 76.3 } },
      { quantity: 3, weights: { square: 70.65, actual: null } },
      { quantity: 0, weights: { square: 0, actual: 0 } },
    ])
    expect(totals).toEqual({ quantity: 9, squareWeight: 146.95, deliveryWeight: 146.95, estimatedCount: 1 })
  })

  it('保存した合計から 1 枚あたりに割り戻す', () => {
    expect(pieceWeightFromTotal(55.2, 3)).toBe(18.4)
    expect(pieceWeightFromTotal(null, 3)).toBeNull()
  })
})

describe('entryLine', () => {
  it('数にならない入力は 0 枚として数える', () => {
    expect(entryLine(cut, { quantity: '', pieceWeight: '' }).quantity).toBe(0)
    expect(entryLine(cut, { quantity: '2', pieceWeight: '' }).quantity).toBe(2)
  })

  it('実重量を入れない行の入力は使わない', () => {
    expect(entryLine(cut, { quantity: '1', pieceWeight: '99' }).weights.actual).toBe(12.72)
  })
})

describe('checkShipmentEntry', () => {
  it('0 の行は出さず、DB の関数に渡す形にする', () => {
    const result = checkShipmentEntry([cut, irregular], {
      cut: { quantity: '0', pieceWeight: '' },
      irregular: { quantity: '2', pieceWeight: '18.4' },
    })
    expect(result).toEqual({ ok: true, items: [{ order_item_id: 'irregular', quantity: 2, piece_weight: 18.4 }] })
  })

  it('実重量の入力は任意', () => {
    const result = checkShipmentEntry([irregular], { irregular: { quantity: '3', pieceWeight: '' } })
    expect(result).toEqual({ ok: true, items: [{ order_item_id: 'irregular', quantity: 3, piece_weight: null }] })
  })

  it('残りを超える数量は断る', () => {
    const result = checkShipmentEntry([cut], { cut: { quantity: '7', pieceWeight: '' } })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.cut).toBe('今回の数量が残り（6）を超えています')
  })

  it('小数の数量・0 以下の実重量は断る', () => {
    const result = checkShipmentEntry([cut, irregular], {
      cut: { quantity: '1.5', pieceWeight: '' },
      irregular: { quantity: '1', pieceWeight: '0' },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors)).toEqual(['cut', 'irregular'])
  })

  it('1 行も出さない送り状は作らない', () => {
    const result = checkShipmentEntry([cut], { cut: { quantity: '0', pieceWeight: '' } })
    expect(result).toEqual({ ok: false, errors: {}, message: '今回出す明細がありません（今回の数量を 1 以上にしてください）' })
  })
})
