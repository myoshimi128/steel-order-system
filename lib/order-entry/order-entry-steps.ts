// 受注登録の 3 つの画面（docs/screen-design.md「画面の流れ」）。
//   info         ① 受注情報
//   items        ② 注文内容（明細）
//   instructions ③ 伝票の指示（スタンプ・フリーコメント）

export type OrderEntryStep = 'info' | 'items' | 'instructions'

export const ORDER_ENTRY_STEPS: readonly { step: OrderEntryStep; label: string }[] = [
  { step: 'info', label: '受注情報' },
  { step: 'items', label: '注文内容' },
  { step: 'instructions', label: '伝票の指示' },
]

// 画面の移動に使うボタンの ID（入力順の最後に置き、Enter で押せるようにする）
export const TO_ITEMS_BUTTON_ID = 'to-items'
export const TO_INSTRUCTIONS_BUTTON_ID = 'to-instructions'
export const SUBMIT_BUTTON_ID = 'submit'
