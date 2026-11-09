// 送り状を作れる受注の一覧の並び順と、状態の表示（docs/screen-design.md「送り状発行」の「入口」）。
// 画面や DB に依存しない純粋な関数にして、テストする。
//
// 並び順:
//   ① 最短出荷（日付はないが、加工が終わり次第すぐ出す約束のため、いちばん上）
//   ② 納期の日付が早い順（確定・仮納期）
//   ③ 後報（日付が決まっていない）
//   ④ 同じなら受注No. の順
// 日付は 'YYYY-MM-DD' の文字のため、文字のまま比べると日付の順になる。

// 一覧の 1 行
export type ShipmentCandidate = {
  id: string
  orderNo: string
  status: string
  isUrgent: boolean
  siteId: string
  customerName: string
  destinationName: string
  projectName: string | null
  dueDateType: string
  dueDate: string | null
  deliveryMethodName: string
  deliveryMethodNote: string | null
  // 受注の数量の合計と、残りの合計（枚）
  orderedQuantity: number
  remainingQuantity: number
}

// 納期の並びの段（小さいほど上）
function dueDateRank(row: Pick<ShipmentCandidate, 'dueDateType' | 'dueDate'>): number {
  if (row.dueDateType === '最短出荷') return 0
  if (row.dueDate !== null) return 1
  return 2
}

export function compareCandidates(a: ShipmentCandidate, b: ShipmentCandidate): number {
  const byRank = dueDateRank(a) - dueDateRank(b)
  if (byRank !== 0) return byRank
  if (a.dueDate !== null && b.dueDate !== null && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  return a.orderNo.localeCompare(b.orderNo, 'ja', { numeric: true })
}

// 並べ替えた新しい配列を返す（渡した配列は変えない）
export function sortCandidates(rows: readonly ShipmentCandidate[]): ShipmentCandidate[] {
  return [...rows].sort(compareCandidates)
}

// 状態の表示。配送依頼済みで残りがあれば「一部出荷」と出す
// （DB の状態は 4 つだけで、一部出荷は送り状の実績と残りの数量から表す）
export function shipmentStatusLabel(status: string, remaining: number): string {
  if (status === '配送依頼済み' && remaining > 0) return `一部出荷（残り ${remaining.toLocaleString('ja-JP')}）`
  return status
}

// 検索の欄の絞り込み（受注No.・得意先・納入先・工事名のどれかに、打った文字が含まれる行）
export function filterCandidates(rows: readonly ShipmentCandidate[], query: string): ShipmentCandidate[] {
  const text = query.trim()
  if (text === '') return [...rows]
  return rows.filter((row) =>
    [row.orderNo, row.customerName, row.destinationName, row.projectName ?? ''].some((value) => value.includes(text))
  )
}
