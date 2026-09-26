// 価格マスタの行を探すときの共通ヘルパー。

// 適用開始日が基準日以前の行のうち、最も新しい行を返す。
// 料金改定で同じ条件の行が複数あっても、受注日時点で有効な単価を選べるようにする。
// valid_from は 'YYYY-MM-DD' 形式のため、文字列のまま大小比較できる。
export function pickLatestValid<T extends { valid_from: string }>(
  rows: T[],
  asOf: string,
): T | undefined {
  let latest: T | undefined
  for (const row of rows) {
    if (row.valid_from > asOf) {
      continue
    }
    if (!latest || row.valid_from > latest.valid_from) {
      latest = row
    }
  }
  return latest
}

// 板厚が行の範囲（thickness_min 以上 thickness_max 以下）に入っているか
export function inThicknessRange(
  row: { thickness_min: number; thickness_max: number },
  thickness: number,
): boolean {
  return row.thickness_min <= thickness && thickness <= row.thickness_max
}
