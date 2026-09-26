// 重量の計算。寸法の単位はすべて mm、重量は kg。
//
// 普通板（ボンデ・ミガキを含む、縞板以外）は鋼材の比重 7.85 から計算する。
// 縞板は縞目の分だけ重量が変わり、メーカーによって単位質量（kg/m²）が異なるため、
// unit_weights マスタの単位質量から計算する。
// どちらの式を使うかは「単位質量が渡されたか」で判定し、種類の名前では分岐しない
// （呼び出し側が縞板のときだけ unit_weights から単位質量を引いて渡す）。
//
// 1枚あたりの重量は丸めずに返す（保証重量の判定に丸める前の値を使うため）。
// 丸めるのは合計重量（calcTotalWeight）のみ。

import { roundTo } from './rounding'

// 鋼材の比重（g/cm³）。板厚(mm) × 面積(mm²) × 7.85 ÷ 1,000,000 で kg になる
const STEEL_DENSITY = 7.85
// 円の重量の係数。7.85 × π ÷ 4 ≒ 6.165 だが、社内の計算方法に合わせて 6.161 を使う
const CIRCLE_COEFFICIENT = 6.161
// 縞板の円の計算に使う円周率（社内の計算方法に合わせて 3.14）
const CHECKERED_PI = 3.14
// mm² → m² の換算、または mm³ × 比重 → kg の換算に使う
const MM_TO_KG_DIVISOR = 1_000_000

// 角（四角形）の重量を計算する。
// ベタ丸・ドーナツの角重量（単価の根拠）も、外径を縦・横として この関数で求める。
export function calcRectangleWeight(input: {
  thickness: number
  width: number
  length: number
  // 縞板の単位質量（kg/m²）。縞板以外は省略する
  unitWeight?: number | null
}): number {
  const { thickness, width, length, unitWeight } = input

  if (unitWeight != null) {
    // 縞板・角: 単位質量 × 縦 × 横 ÷ 1,000,000
    return (unitWeight * width * length) / MM_TO_KG_DIVISOR
  }
  // 普通板・角: 板厚 × 縦 × 横 × 7.85 ÷ 1,000,000
  return (thickness * width * length * STEEL_DENSITY) / MM_TO_KG_DIVISOR
}

// 円（ベタ丸）・ドーナツの実重量を計算する。
// ドーナツは内径を渡すと、外円の重量から内円の分を差し引く。
export function calcCircleWeight(input: {
  thickness: number
  outerDiameter: number
  // ドーナツの内径。ベタ丸は省略する
  innerDiameter?: number | null
  // 縞板の単位質量（kg/m²）。縞板以外は省略する
  unitWeight?: number | null
}): number {
  const { thickness, outerDiameter, unitWeight } = input
  const innerDiameter = input.innerDiameter ?? 0

  if (unitWeight != null) {
    // 縞板・円: 単位質量 × 半径² × 3.14 ÷ 1,000,000（内径分を差し引く）
    const outerRadius = outerDiameter / 2
    const innerRadius = innerDiameter / 2
    return (
      (unitWeight * (outerRadius ** 2 - innerRadius ** 2) * CHECKERED_PI) / MM_TO_KG_DIVISOR
    )
  }
  // 普通板・円: 板厚 × 直径² × 6.161 ÷ 1,000,000（内径分を差し引く）
  return (
    (thickness * (outerDiameter ** 2 - innerDiameter ** 2) * CIRCLE_COEFFICIENT) /
    MM_TO_KG_DIVISOR
  )
}

// 合計重量 = 1枚あたりの重量 × 枚数 を小数第2位までに四捨五入する。
// 1枚ごとに丸めてから掛けると誤差が枚数倍に膨らむため、掛けた後に丸める。
export function calcTotalWeight(pieceWeight: number, quantity: number): number {
  return roundTo(pieceWeight * quantity, 2)
}
