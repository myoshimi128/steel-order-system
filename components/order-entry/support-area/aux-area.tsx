'use client'

// ③ 伝票の指示の中身。スタンプ・フリーコメントの 2 つの枠を横に並べる
// （docs/screen-design.md「③ 伝票の指示」）。入力順は スタンプの番号 → フリーコメント → 登録ボタン。
// 明細ごとの摘要は使わず、伝えたいことはフリーコメントに書く。
// 得意先の注意事項は ② 注文内容の帯で見せるため、ここには出さない。

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
    // 受注情報の要約の下の残りの高さを、2 つの枠で使う
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 p-3">
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
