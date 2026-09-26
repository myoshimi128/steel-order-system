// 端数処理のヘルパー。
//
// JavaScript の数値は2進数の浮動小数点のため、0.1 + 0.2 が 0.30000000000000004 になるような
// 誤差が出る。そのまま Math.round などを使うと、277.5 のつもりが 277.49999… となって
// 丸め結果がずれることがあるため、いったん十分な桁数で誤差を取り除いてから丸める。

// 浮動小数点の誤差を取り除く（小数第10位までで丸める）
function removeFloatError(value: number): number {
  return Number(value.toFixed(10))
}

// 指定した小数桁数で四捨五入する（例: roundTo(1.005, 2) → 1.01）
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(removeFloatError(value * factor)) / factor
}

// 円未満を切り上げる（例: 535.5 → 536）。枚単価・金額の端数処理に使う
export function ceilToYen(value: number): number {
  return Math.ceil(removeFloatError(value))
}

// 5円単位で切り捨てる（例: 277.5 → 275、262.5 → 260）
export function floorTo5(value: number): number {
  return Math.floor(removeFloatError(value / 5)) * 5
}
