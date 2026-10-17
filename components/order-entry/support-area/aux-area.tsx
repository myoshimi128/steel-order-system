'use client'

// ③ 伝票の指示の下段。得意先の注意事項・スタンプ・フリーコメントの 3 つの枠を横に並べる
// （docs/screen-design.md「③ 伝票の指示」）。入力順は 摘要 → スタンプの番号 → フリーコメント → 登録ボタン。

import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import type { DisplayedNotice } from '@/lib/order-entry/notices'
import {
  FREE_COMMENT_FIELD_ID,
  STAMP_CODE_FIELD_ID,
  type OrderAuxState,
} from '@/lib/order-entry/use-order-aux'
import { CustomerNoticePanel } from './customer-notice-panel'
import { FreeCommentPanel } from './free-comment-panel'
import { StampPanel } from './stamp-panel'

type AuxAreaProps = {
  aux: OrderAuxState
  notices: readonly DisplayedNotice[]
  hasCustomer: boolean
  showShotStamp: boolean
  navigation: FieldNavigation
}

export function AuxArea({ aux, notices, hasCustomer, showShotStamp, navigation }: AuxAreaProps) {
  return (
    <div className="grid h-48 shrink-0 grid-cols-3 gap-3 border-t border-line p-3">
      <CustomerNoticePanel notices={notices} hasCustomer={hasCustomer} />
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
