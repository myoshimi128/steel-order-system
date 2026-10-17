'use client'

// 受注登録画面の補助エリア（スタンプ・フリーコメント）の入力値を管理するカスタムフック。
//
//   ・スタンプ: 番号の欄に番号を打って Enter で付け外しする（テンキーで操作するため）。クリックでも付け外しできる。
//     得意先の指定スタンプは、得意先を選んだ時点でチェックが入る（stamps.ts）
//   ・フリーコメント: 受注全体のコメント（orders.field_note）
// 注意事項は表示のみのため、ここでは扱わない（notices.ts で絞り込む）。
// 画面の部品（components/order-entry/support-area/*）はこのフックの戻り値を表示するだけにする。

import { useState } from 'react'
import type { OrderAuxInput } from './order-aux'
import {
  checkedStampIds,
  designatedStampIds,
  findStampByCode,
  stampStates,
  toggleStamp,
  type CustomerStampMaster,
  type StampMaster,
  type StampOverrides,
} from './stamps'

// 補助エリアの欄の ID（入力順の管理に使う）。入力順は 明細 → スタンプの番号 → フリーコメント → 登録ボタン
export const STAMP_CODE_FIELD_ID = 'stampCode'
export const FREE_COMMENT_FIELD_ID = 'freeComment'

export type OrderAuxMasters = {
  stamps: readonly StampMaster[]
  customerStamps: readonly CustomerStampMaster[]
}

// 番号の欄で Enter を押したときの結果
//   toggled: スタンプを付け外しした（欄は空に戻り、カーソルはそのまま）
//   empty  : 欄が空だった（次の欄へ進む）
//   error  : 存在しない番号だった
export type StampCodeResult = 'toggled' | 'empty' | 'error'

export function useOrderAux(masters: OrderAuxMasters, customerId: string | null) {
  // 手で付け外ししたスタンプ。得意先を変えてもそのまま残す
  const [overrides, setOverrides] = useState<StampOverrides>({})
  // 番号の欄に打った番号と、そのエラー
  const [stampCode, setStampCodeState] = useState('')
  const [stampCodeError, setStampCodeError] = useState<string | undefined>(undefined)
  const [freeComment, setFreeComment] = useState('')

  // 得意先の指定スタンプと手での付け外しを合わせた、スタンプごとの状態（描画のたびに求める）
  const states = stampStates(
    masters.stamps,
    designatedStampIds(masters.customerStamps, customerId),
    overrides,
  )

  function toggle(stampId: string) {
    setOverrides((current) => toggleStamp(states, current, stampId))
  }

  function setStampCode(code: string) {
    setStampCodeState(code)
    setStampCodeError(undefined)
  }

  // 番号の欄で Enter を押したとき。番号のスタンプを付け外しし、欄を空に戻す
  function enterStampCode(): StampCodeResult {
    if (!stampCode.trim()) {
      return 'empty'
    }
    const stamp = findStampByCode(masters.stamps, stampCode)
    if (!stamp) {
      setStampCodeError('存在しない番号です')
      return 'error'
    }
    toggle(stamp.id)
    setStampCodeState('')
    return 'toggled'
  }

  // 保存用の値
  function toInput(): OrderAuxInput {
    return { stampIds: checkedStampIds(states), fieldNote: freeComment }
  }

  // 保存後に次の受注を入力するため、初期値に戻す
  function reset() {
    setOverrides({})
    setStampCodeState('')
    setStampCodeError(undefined)
    setFreeComment('')
  }

  return {
    states,
    toggle,
    stampCode,
    stampCodeError,
    setStampCode,
    enterStampCode,
    freeComment,
    setFreeComment,
    toInput,
    reset,
  }
}

export type OrderAuxState = ReturnType<typeof useOrderAux>
