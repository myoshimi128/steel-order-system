'use client'

// ② 注文内容の明細の表の下に置く帯。スタンプ・フリーコメントの 2 つの枠を横に並べる
// （docs/screen-design.md「スタンプ・フリーコメントの帯」）。
// 入力順は 明細 →（最後の空の行で Enter）→ スタンプの番号 → フリーコメント → 登録ボタン。
// 明細の行数をできるだけ見せるため、帯の高さは固定して低めにする（中身が多いときは枠の中でスクロール）。
// 明細ごとの摘要は使わず、伝えたいことはフリーコメントに書く。

import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import {
  FREE_COMMENT_FIELD_ID,
  STAMP_CODE_FIELD_ID,
  type OrderAuxState,
} from '@/lib/order-entry/use-order-aux'
import { FreeCommentPanel } from './free-comment-panel'
import { StampPanel } from './stamp-panel'

type AuxAreaProps = {
  aux: OrderAuxState
  showShotStamp: boolean
  navigation: FieldNavigation
}

export function AuxArea({ aux, showShotStamp, navigation }: AuxAreaProps) {
  return (
    <div className="grid h-36 shrink-0 grid-cols-[3fr_2fr] gap-2 border-t border-line bg-canvas p-2">
      <StampPanel
        aux={aux}
        showShotStamp={showShotStamp}
        fieldProps={navigation.fieldProps(STAMP_CODE_FIELD_ID)}
      />
      <FreeCommentPanel
        value={aux.freeComment}
        onValueChange={aux.setFreeComment}
        fieldProps={navigation.fieldProps(FREE_COMMENT_FIELD_ID)}
      />
    </div>
  )
}
