// 「受注登録待ちに追加」（S-06b）の選択肢と入力の確かめ（docs/intake/screen-design.md「S-06b」）。
//
// 振り分けの見落とし・口頭での追加注文などの例外を、振り分け完了後の受付に区分として足す。
//   ・受付No.  : 必須。振り分け完了（dispatched）か完了（closed）の受付だけ
//   ・追加の理由: 必須。「その他」のときはメモも必須（何のための追加かが分かるように）
//   ・区分      : 必須。先寸 → 受注登録待ち、アイトレ → CAD の作業待ち
// DB の関数 add_work_unit_with_files でも同じことを確かめる（画面の確かめは、押す前に分かるようにするため）。

import { INTAKE_STATUS_LABELS, type IntakeStatus, type WorkUnitKind, type WorkUnitOrigin } from './constants'

export type AddOrigin = Exclude<WorkUnitOrigin, 'split'>

export const ADD_ORIGIN_OPTIONS: readonly { value: AddOrigin; label: string }[] = [
  { value: 'oversight', label: '振り分けの見落とし' },
  { value: 'verbal', label: '口頭での追加注文' },
  { value: 'other', label: 'その他' },
]

export const ADD_KIND_OPTIONS: readonly { value: WorkUnitKind; label: string }[] = [
  { value: 'sakisun', label: '先寸' },
  { value: 'aitore', label: 'アイトレ（CAD へ）' },
]

// メモの文字数の上限
export const ADD_NOTE_MAX_LENGTH = 200

// 受付の状態から、追加できない理由を返す（追加できるなら null）
export function addableIntakeError(status: IntakeStatus): string | null {
  if (status === 'dispatched' || status === 'closed') return null
  if (status === 'registered') {
    return '振り分けがまだ終わっていません。見落としの図面は、振り分けの画面で枠に入れてください'
  }
  return `この受付には追加できません（状態: ${INTAKE_STATUS_LABELS[status]}）`
}

export type AddWorkUnitInput = {
  // 呼び出した受付（呼び出していなければ null）
  intakeStatus: IntakeStatus | null
  origin: AddOrigin | null
  kind: WorkUnitKind | null
  note: string
}

export type AddWorkUnitErrors = Partial<Record<'intakeNo' | 'origin' | 'kind' | 'note', string>>

// 「追加する」を押したときの確かめ。エラーがなければ空のオブジェクト
export function validateAddWorkUnit(input: AddWorkUnitInput): AddWorkUnitErrors {
  const errors: AddWorkUnitErrors = {}
  if (input.intakeStatus === null) {
    errors.intakeNo = '受付No. を入力して呼び出してください'
  } else {
    const reason = addableIntakeError(input.intakeStatus)
    if (reason) errors.intakeNo = reason
  }
  if (input.origin === null) errors.origin = '追加の理由を選んでください'
  if (input.kind === null) errors.kind = '区分を選んでください'
  if (input.origin === 'other' && input.note.trim() === '') {
    errors.note = '「その他」のときは、追加の理由をメモに書いてください'
  }
  if (input.note.length > ADD_NOTE_MAX_LENGTH) errors.note = `メモは ${ADD_NOTE_MAX_LENGTH} 文字までです`
  return errors
}
