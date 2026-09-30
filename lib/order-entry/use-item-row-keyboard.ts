'use client'

// 明細の行の中のキー操作を扱うカスタムフック（docs/screen-design.md「キー操作」）。
//
//   *              直前の行を今の行に複写する
//   -              その行の摘要へ移る
//   +              加工の行を追加する（次の作業で実装するため、今は案内を出すだけ）
//   Ctrl + Delete  行を削除する
//   Ctrl + Insert  今の行の前に行を挿入する
//
// これらは番号・寸法・数量の欄でだけ有効にする。文字を入れる欄（摘要・一覧の検索の欄。
// data-free-text の印がある欄）では普通の文字として入力する。
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
  // 画面に案内を出す（「+」の加工の行など）
  onNotice: (message: string) => void
}

export function useItemRowKeyboard({ rowKey, items, navigation, onNotice }: UseItemRowKeyboardParams) {
  return function handleRowKeyDown(event: KeyboardEvent<HTMLElement>) {
    const target = event.target as HTMLElement
    // 文字を入れる欄・日本語入力の変換中は、普通の入力として扱う
    if (target.dataset.freeText === 'true' || isComposing(event)) {
      return
    }

    if (event.ctrlKey && event.key === 'Delete') {
      event.preventDefault()
      const nextKey = items.deleteRow(rowKey)
      navigation.focusFieldLater(itemFieldId(nextKey, 'cuttingMethod'))
      return
    }
    if (event.ctrlKey && event.key === 'Insert') {
      event.preventDefault()
      const newKey = items.insertRowBefore(rowKey)
      navigation.focusFieldLater(itemFieldId(newKey, 'cuttingMethod'))
      return
    }
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return
    }

    switch (event.key) {
      case '*':
        event.preventDefault()
        if (!items.copyPreviousRow(rowKey)) {
          onNotice('先頭の行には複写する行がありません')
        }
        return
      case '-':
        event.preventDefault()
        navigation.focusField(itemFieldId(rowKey, 'fieldNote'))
        return
      case '+':
        event.preventDefault()
        onNotice('加工の行の追加は次の作業で対応します')
        return
    }
  }
}
