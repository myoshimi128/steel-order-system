// 振り分け（S-04d）の判定（docs/intake/screen-design.md「S-04d 振り分け」）。
//
//   ・元データ 1 件の状態: 枠に同じ名前のファイルがある →「→先寸」「→アイトレ」、
//     人が「分割して保存済」にした →「分割して保存済」、どれでもない →「未振り分け」
//   ・未振り分けの元データの数（振り分け完了の前に確かめる。完了すると元データは消える）
//   ・図面なしで登録するボタンを出すか（2 つの枠がどちらも空のとき）
//   ・振り分け完了の確認の文
// 画面や DB に依存しない純粋な関数にして、テストする。

import { WORK_UNIT_KIND_LABELS, type WorkUnitKind } from './constants'

export const SPLIT_SLOTS: readonly WorkUnitKind[] = ['sakisun', 'aitore']

// 元データ（kind = 'original'）
export type SplitOriginal = { id: string; originalName: string; splitDone: boolean }
// 枠に入れたファイル（kind = 'split'）
export type SplitSlotFile = { id: string; originalName: string; slot: WorkUnitKind }

export type OriginalState =
  | { kind: 'assigned'; slots: WorkUnitKind[] }
  | { kind: 'splitDone' }
  | { kind: 'unassigned' }

// 元データ 1 件の状態。枠に同じ名前のファイルがあれば、その枠に振り分け済みとみなす
// （1 部品ずつの DXF を、そのまま枠へドラッグしたとき）
export function originalStateOf(original: SplitOriginal, slotFiles: readonly SplitSlotFile[]): OriginalState {
  const slots = SPLIT_SLOTS.filter((slot) =>
    slotFiles.some((file) => file.slot === slot && file.originalName === original.originalName)
  )
  if (slots.length > 0) return { kind: 'assigned', slots }
  if (original.splitDone) return { kind: 'splitDone' }
  return { kind: 'unassigned' }
}

// 状態の表示（「→先寸」「→先寸・アイトレ」「分割して保存済」「未振り分け」）
export function originalStateLabel(state: OriginalState): string {
  switch (state.kind) {
    case 'assigned':
      return `→${state.slots.map((slot) => WORK_UNIT_KIND_LABELS[slot]).join('・')}`
    case 'splitDone':
      return '分割して保存済'
    case 'unassigned':
      return '未振り分け'
  }
}

// 未振り分けの元データの数
export function countUnassigned(
  originals: readonly SplitOriginal[],
  slotFiles: readonly SplitSlotFile[]
): number {
  return originals.filter((original) => originalStateOf(original, slotFiles).kind === 'unassigned').length
}

// 枠ごとのファイルの数
export function slotCounts(slotFiles: readonly SplitSlotFile[]): Record<WorkUnitKind, number> {
  return {
    sakisun: slotFiles.filter((file) => file.slot === 'sakisun').length,
    aitore: slotFiles.filter((file) => file.slot === 'aitore').length,
  }
}

// 「図面なしで ○○ として登録」のボタンを出すか。2 つの枠がどちらも空のとき
// （図面が 1 つもない注文。FAX・口頭など）
export function canRegisterWithoutDrawings(slotFiles: readonly SplitSlotFile[]): boolean {
  return slotFiles.length === 0
}

// 振り分け完了の確認の文。
// withoutDrawings: 図面なしで登録する区分（ボタンで選んだもの）。枠にファイルがあるときは null
export function completeConfirmText(
  counts: Record<WorkUnitKind, number>,
  unassigned: number,
  withoutDrawings: WorkUnitKind | null
): string {
  const lines: string[] = []
  if (withoutDrawings) {
    lines.push(`図面なしで「${WORK_UNIT_KIND_LABELS[withoutDrawings]}」として振り分けを完了します。`)
  } else {
    const parts = SPLIT_SLOTS.filter((slot) => counts[slot] > 0).map(
      (slot) => `${WORK_UNIT_KIND_LABELS[slot]} ${counts[slot]} ファイル`
    )
    lines.push(`${parts.join('・')}で振り分けを完了します。`)
  }
  if (unassigned > 0) {
    lines.push(`未振り分けの元データが ${unassigned} 件あります。元データは完了すると削除されます。`)
  }
  lines.push('完了すると、振り分けはやり直せません。よろしいですか？')
  return lines.join('\n')
}
