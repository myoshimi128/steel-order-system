// 加工の行の項目（入力の形ごとの項目）の型。
//
// 加工種別マスタの「入力の形」（process_types.input_shape）ごとに、入力する項目が異なる
// （docs/basic-design.md「加工の入力項目」）。画面の入力値（文字列）を解釈した結果をこの型で持ち、
// 伝票の文（加工内容）の組み立て・保存用の JSON（spec_fields）の作成・数量の計算に使う。

import type { BendStyle } from '../constants'
import type { ItemErrors } from '../item-types'

// 自由入力: 加工内容を文字で入力する（空欄でもよい）
export type FreeSpec = { shape: '自由入力'; text: string }

// 穴: 1 枚あたりの孔数と穴径（mm）。例: 1S/ 12孔 38φ
export type HoleSpec = { shape: '穴'; holesPerPiece: number; holeDiameter: number }

// 曲げ: ヶ所数と曲げ方。曲げ方がフリーのときだけ、入力した文字（「曲げ」を除いた部分）を持つ
export type BendSpec = {
  shape: '曲げ'
  bendCount: number
  bendStyle: BendStyle
  bendStyleNote: string | null
}

export type ProcessSpec = FreeSpec | HoleSpec | BendSpec

// 項目の確認の結果。項目がそろっていない・誤っている場合は spec が null
export type ProcessSpecCheck<T extends ProcessSpec = ProcessSpec> = {
  spec: T | null
  // 保存時に出すエラー（未入力の項目）
  errors: ItemErrors
  // 入力中から出す警告（数値として正しくない など）
  liveErrors: ItemErrors
}
