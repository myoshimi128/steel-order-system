// 受注登録画面のキー操作の案内に出す項目（docs/screen-design.md「キー操作」）。
//
// 画面下部には、よく使うキー（Enter・/・F3・F4・*・+）だけを並べる。
// 残りのキー（Shift+Enter・End・F2・- → 行番号 など）は「キー操作の一覧」を開いて見る。
// 2 つの画面で使えるキーが違うため、画面下部には今の画面で使えるものだけを出す。

import type { OrderEntryStep } from './order-entry-steps'

// joiner はキーの間に入れる記号。
//   '+' … 同時に押す（Shift + Enter）
//   '→' … 続けて押す（- → 行番号 → Enter）
//   '/' … どちらか（/ または End）
export type KeyItem = { keys: string[]; joiner?: '+' | '→' | '/'; label: string }

// 画面下部に並べる、よく使うキー（画面ごと）
const FREQUENT_COMMON: KeyItem[] = [
  { keys: ['Enter'], label: '次へ' },
  { keys: ['/'], label: '一覧' },
]
const FREQUENT_ITEMS: KeyItem[] = [
  { keys: ['F3'], label: '行挿入' },
  { keys: ['F4'], label: '行削除' },
  { keys: ['*'], label: '複写' },
  { keys: ['+'], label: '加工の行を追加' },
]

export function frequentKeys(step: OrderEntryStep): KeyItem[] {
  return step === 'items' ? [...FREQUENT_COMMON, ...FREQUENT_ITEMS] : FREQUENT_COMMON
}

// 「キー操作の一覧」に出す全部のキー。どの画面で使うかでまとめる
export const ALL_KEY_GROUPS: readonly { title: string; items: KeyItem[] }[] = [
  {
    title: 'どの画面でも',
    items: [
      { keys: ['Enter'], label: '次の欄へ' },
      { keys: ['Shift', 'Enter'], joiner: '+', label: '前の欄へ' },
      { keys: ['↑', '↓'], joiner: '/', label: '上・下の欄へ' },
      { keys: ['/', 'End'], joiner: '/', label: '番号の一覧を開く' },
      { keys: ['F2'], label: '注文書のパネルの開閉' },
    ],
  },
  {
    title: '番号の欄',
    items: [{ keys: ['上限の桁まで打つ'], label: 'Enter なしで次の欄へ（存在しない番号ならエラー）' }],
  },
  {
    title: '② 注文内容（明細）',
    items: [
      { keys: ['*'], label: '直前の行を複写（加工の行もまとめて）' },
      { keys: ['-', '行番号', 'Enter'], joiner: '→', label: 'その番号の行を複写（切断・区分の欄で）' },
      { keys: ['+'], label: '加工の行を追加' },
      { keys: ['F3'], label: '行挿入（Ctrl + Insert でも可）' },
      { keys: ['F4'], label: '行削除（加工の行もまとめて。Ctrl + Delete でも可）' },
      { keys: ['Enter'], label: '最後の空の行で押すと、スタンプの番号へ' },
    ],
  },
  {
    title: '② 注文内容（スタンプ・フリーコメント）',
    items: [
      { keys: ['番号', 'Enter'], joiner: '→', label: 'スタンプの付け外し' },
      { keys: ['Ctrl', 'Enter'], joiner: '+', label: 'フリーコメントの改行' },
    ],
  },
]
