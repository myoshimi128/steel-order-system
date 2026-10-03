// 補助エリアのうち、受注に保存するもの（スタンプ・フリーコメント）の確認と、保存用のデータ。
//
// 注意事項は表示のみで保存しない。スプライス専用の受注の「ショット加工」も保存しない
// （orders.splice_shot から表示・印字する）。
// 画面とサーバー（Server Action）の両方で使うため、画面や DB に依存しない純粋な関数にしている。

import type { StampMaster } from './stamps'

// 保存に使う補助エリアの値
export type OrderAuxInput = {
  // チェックの入っているスタンプの id
  stampIds: string[]
  // フリーコメント（現場用伝票に印字する。改行を含んでよい）
  fieldNote: string
}

// サーバーでの確認。画面を経由しない呼び出しもありうるため、
// スタンプの id が受注登録画面で選べるスタンプ（有効なスタンプ）かを確かめる。
// 問題があればメッセージを返す
export function validateOrderAux(input: OrderAuxInput, stamps: readonly StampMaster[]): string | null {
  const ids = new Set(stamps.map((stamp) => stamp.id))
  if (input.stampIds.some((id) => !ids.has(id))) {
    return '選べないスタンプが含まれています。画面を開き直してください'
  }
  if (new Set(input.stampIds).size !== input.stampIds.length) {
    return '同じスタンプが重複しています'
  }
  return null
}

// create_order に渡すヘッダーの JSON に加える値（orders.field_note と、order_stamps に登録するスタンプ）
export function buildOrderAuxPayload(input: OrderAuxInput) {
  const fieldNote = input.fieldNote.trim()
  return {
    field_note: fieldNote === '' ? null : fieldNote,
    stamp_ids: input.stampIds,
  }
}
