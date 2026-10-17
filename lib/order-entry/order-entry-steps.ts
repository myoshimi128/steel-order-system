// 受注登録の 2 つの画面（docs/screen-design.md「画面の流れ」）。
//   info  ① 受注情報
//   items ② 注文内容（明細＋スタンプ・フリーコメント）
// 以前は ③ 伝票の指示（スタンプ・フリーコメント）を別の画面にしていたが、② の明細の下にまとめた。

export type OrderEntryStep = 'info' | 'items'

export const ORDER_ENTRY_STEPS: readonly { step: OrderEntryStep; label: string }[] = [
  { step: 'info', label: '受注情報' },
  { step: 'items', label: '注文内容' },
]

// 入力順の最後に置くボタンの ID（Enter で押せるようにする）
export const TO_ITEMS_BUTTON_ID = 'to-items'
export const SUBMIT_BUTTON_ID = 'submit'
