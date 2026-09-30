'use client'

// 入力欄の移動（Enter・↓ で次の欄、Shift+Enter・↑ で前の欄）を管理するカスタムフック。
//
// 受注登録画面はテンキーだけで入力を進めるため、Tab ではなく Enter で次の欄へ移る
// （docs/screen-design.md「入力方式」）。入力順は欄の ID の配列で受け取り、
// 表示されていない欄（スプライスでないときの継手番号など）や無効な欄は飛ばす。
//
// 使い方:
//   const navigation = useFieldNavigation(['customerId', 'customerContact', ...])
//   <input ref={navigation.register('customerId')} ... />
//   Enter のときに navigation.focusNext('customerId') を呼ぶ

import { useCallback, useLayoutEffect, useRef, type KeyboardEvent } from 'react'
import { isComposing } from './is-composing'

// フォーカスを当てられる要素（input・button など）
type FocusableElement = HTMLElement

export function useFieldNavigation(order: readonly string[]) {
  // 欄の ID → 画面上の要素。ref コールバックで登録・解除する
  const elementsRef = useRef(new Map<string, FocusableElement>())
  // ID ごとの ref コールバック。毎回新しい関数を作ると React が登録・解除を繰り返すため使い回す
  const refCallbacksRef = useRef(new Map<string, (element: FocusableElement | null) => void>())
  // 最新の入力順。フォーカスの移動は画面の更新後に行うため、ref で最新値を参照する
  const orderRef = useRef(order)

  // 描画のたびに最新の入力順を ref に反映する（画面の更新が確定した直後に実行される）
  useLayoutEffect(() => {
    orderRef.current = order
  })

  // 欄の要素を登録するための ref コールバックを返す
  const register = useCallback((id: string) => {
    let callback = refCallbacksRef.current.get(id)
    if (!callback) {
      callback = (element: FocusableElement | null) => {
        if (element) {
          elementsRef.current.set(id, element)
        } else {
          elementsRef.current.delete(id)
        }
      }
      refCallbacksRef.current.set(id, callback)
    }
    return callback
  }, [])

  // 指定した欄にフォーカスを当てる。入力欄なら中身を全選択し、上書きで入力できるようにする
  const focusField = useCallback((id: string): boolean => {
    const element = elementsRef.current.get(id)
    if (!element || element.hasAttribute('disabled')) {
      return false
    }
    element.focus()
    if (element instanceof HTMLInputElement) {
      element.select()
    }
    return true
  }, [])

  // 入力順で step（+1 は次、-1 は前）の方向にある、フォーカスできる欄へ移る
  const move = useCallback(
    (fromId: string, step: 1 | -1) => {
      const currentOrder = orderRef.current
      const fromIndex = currentOrder.indexOf(fromId)
      // 入力順に含まれない欄（明細の摘要など）からは移動しない（先頭の欄へ飛んでしまうため）
      if (fromIndex < 0) {
        return
      }
      let index = fromIndex + step
      while (index >= 0 && index < currentOrder.length) {
        if (focusField(currentOrder[index])) {
          return
        }
        index += step
      }
    },
    [focusField],
  )

  // 次の欄へ移る。
  // 直前の入力で表示される欄が変わる場合（スプライスを 1 にすると継手番号が出る など）、
  // 画面の更新が終わってから移動しないと、新しく出た欄を飛ばしてしまう。
  // そのため setTimeout で「今の処理と画面の更新が終わった後」に移動する。
  const focusNext = useCallback(
    (fromId: string) => {
      setTimeout(() => move(fromId, 1), 0)
    },
    [move],
  )

  const focusPrevious = useCallback(
    (fromId: string) => {
      setTimeout(() => move(fromId, -1), 0)
    },
    [move],
  )

  // 指定した欄へ、画面の更新が終わってから移る（行を挿入した直後など、欄がまだ画面にない場合）
  const focusFieldLater = useCallback(
    (id: string) => {
      setTimeout(() => focusField(id), 0)
    },
    [focusField],
  )

  // 入力順の最初の欄へ移る（保存後に次の入力を始めるときなど）
  const focusFirst = useCallback(() => {
    setTimeout(() => {
      for (const id of orderRef.current) {
        if (focusField(id)) {
          return
        }
      }
    }, 0)
  }, [focusField])

  // 入力欄の部品（CodeField・DateField・TextField）に渡す props をまとめて作る。
  //   <CodeField {...navigation.fieldProps('customerId')} ... />
  const fieldProps = useCallback(
    (id: string) => ({
      id,
      inputRef: register(id),
      onNext: () => focusNext(id),
      onPrevious: () => focusPrevious(id),
    }),
    [register, focusNext, focusPrevious],
  )

  // 矢印キー（↑ で前の欄、↓ で次の欄）での移動。画面全体の外枠の onKeyDown に渡して使う。
  //   <div onKeyDown={navigation.handleArrowKeys}> ... </div>
  // 欄ごとに処理を書かず、ここ 1 か所でヘッダー・明細の両方の欄を同じように動かす。
  // ← → は欄の中の文字の移動に使うため、ここでは扱わない。
  // 次の場合は移動しない（欄の側の操作を優先する）。
  //   ・欄の側でキーを処理済み（event.defaultPrevented）: 「/」で一覧を開いているときの候補の選択など
  //   ・日本語入力の変換中: ↑↓ は変換候補の選択に使う
  //   ・入力順に登録されていない欄（一覧の検索の欄・明細の摘要など）
  const handleArrowKeys = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
        return
      }
      if (
        event.defaultPrevented ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        isComposing(event)
      ) {
        return
      }
      // フォーカスのある要素から、欄の ID を探す
      let fieldId: string | undefined
      for (const [id, element] of elementsRef.current) {
        if (element === event.target) {
          fieldId = id
          break
        }
      }
      if (!fieldId || !orderRef.current.includes(fieldId)) {
        return
      }
      // 入力欄の中でカーソルが先頭・末尾へ動く既定の動作を止めて、欄を移動する
      event.preventDefault()
      move(fieldId, event.key === 'ArrowDown' ? 1 : -1)
    },
    [move],
  )

  return {
    register,
    fieldProps,
    handleArrowKeys,
    focusField,
    focusFieldLater,
    focusNext,
    focusPrevious,
    focusFirst,
  }
}

export type FieldNavigation = ReturnType<typeof useFieldNavigation>
