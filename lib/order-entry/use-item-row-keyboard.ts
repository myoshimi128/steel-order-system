'use client'

// 明細の行の中のキー操作を扱うカスタムフック（docs/screen-design.md「行の操作」）。
//
//   *                     複写する
//                           材料の行: 直前の材料の行を、加工の行ごと今の行に写す
//                           加工の行: 何もしない（加工は 1 行にまとめて入力するため、写す必要がない）
//   - → 行番号 → Enter    その番号の材料の行を写す（切断・区分の欄だけ。CodeField の command で扱う）
//   +                     加工の行を追加する（今の材料の行の、最後の加工の行のすぐ下）
//   F4 / Ctrl + Delete    行を削除する（材料の行は加工の行ごと）
//   F3 / Ctrl + Insert    今の行の前に行を挿入する
//
// 以前は「-」でその行の摘要へ移動していたが、明細ごとの摘要を使わなくなったため、行番号での複写に使う。
// 以前は「行番号 → *」で行番号の複写をしていたが、切断・区分が 2 桁で自動で次へ進むようになり
// （「12」と打つと 12 シャー型切りとして進む）、行番号と区別できなくなったため「-」に移した。
//
// これらは番号・寸法・数量の欄でだけ有効にする。文字を入れる欄（加工内容・一覧の検索の欄。
// data-free-text の印がある欄）では普通の文字として入力する（F3・F4 は文字を入力しないため、どの欄でも効く）。
// 行の外枠の onKeyDown で受け取るため、各欄の部品に処理を足さなくて済む
// （キーの既定動作＝文字の入力は、欄の処理が終わった後に行われるため、ここで止められる）。

import type { KeyboardEvent } from 'react'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { isComposing } from '@/lib/hooks/is-composing'
import { itemFieldId } from './item-row'
import type { OrderItemsState } from './use-order-items'

type UseItemRowKeyboardParams = {
  rowKey: string
  items: OrderItemsState
  navigation: FieldNavigation
  // 画面に案内を出す（複写できなかった理由など）
  onNotice: (message: string) => void
}

export function useItemRowKeyboard({ rowKey, items, navigation, onNotice }: UseItemRowKeyboardParams) {
  return function handleRowKeyDown(event: KeyboardEvent<HTMLElement>) {
    // 日本語入力の変換中は、普通の入力として扱う
    if (isComposing(event)) {
      return
    }

    // 行の削除・挿入。F3 はブラウザでは「次を検索」、F4 は何もしないキーのため、既定の動作を止めて使う
    const isDelete = event.key === 'F4' || (event.ctrlKey && event.key === 'Delete')
    const isInsert = event.key === 'F3' || (event.ctrlKey && event.key === 'Insert')
    if (isDelete) {
      event.preventDefault()
      // 削除した位置にある行の先頭の欄（材料の行は切断・区分、加工の行は加工方法）へ移る
      navigation.focusFieldLater(items.deleteRow(rowKey))
      return
    }
    if (isInsert) {
      event.preventDefault()
      const newKey = items.insertRowBefore(rowKey)
      navigation.focusFieldLater(itemFieldId(newKey, 'cutRegion'))
      return
    }

    const target = event.target as HTMLElement
    // 文字を入れる欄では「*」「+」を普通の文字として入力する
    if (target.dataset.freeText === 'true') {
      return
    }
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return
    }

    switch (event.key) {
      case '*': {
        event.preventDefault()
        // 直前の材料の行を写す（行番号を指定するときは「-」→ 行番号 → Enter）
        const result = items.copyRow(rowKey, null)
        if (!result.ok) {
          onNotice(result.message)
        }
        return
      }
      case '+': {
        event.preventDefault()
        const newKey = items.addProcessRow(rowKey)
        // 追加した加工の行の、加工方法の欄へ移る（切断・区分は 9 加工が入っている）
        navigation.focusFieldLater(itemFieldId(newKey, 'processType'))
        return
      }
    }
  }
}
