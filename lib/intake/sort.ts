// 受注登録待ち・CAD の一覧の並び順（docs/intake/screen-design.md「並び順」）。
//
//   ① 至急の受付を先に
//   ② 受付の納期の日付が早い順
//   ③ 納期の日付なし（後報など）はその後
//   ④ 同じなら、受付登録の日時が古い順（先に受け付けたものから）
// 紙のカゴで「急ぎのものを上に積む」のと同じ並びを、データから決める。
// 日付は 'YYYY-MM-DD'、日時は ISO 8601 の文字のため、文字のまま比べると日付の順になる。

export type QueueSortKey = {
  isUrgent: boolean
  dueDate: string | null
  // 受付登録の日時（なければ最後）
  registeredAt: string | null
}

// 空の値（null）を最後に回して比べる
function compareNullableText(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -1 : 1
}

// Array.prototype.sort に渡す比べ方（負なら a が先）
export function compareQueueOrder(a: QueueSortKey, b: QueueSortKey): number {
  if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1
  const byDueDate = compareNullableText(a.dueDate, b.dueDate)
  if (byDueDate !== 0) return byDueDate
  return compareNullableText(a.registeredAt, b.registeredAt)
}

// 並べ替えた新しい配列を返す（渡した配列は変えない）
export function sortByQueueOrder<T extends QueueSortKey>(rows: readonly T[]): T[] {
  return [...rows].sort(compareQueueOrder)
}
