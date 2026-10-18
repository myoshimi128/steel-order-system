'use client'

// 開いている一覧（通知ベルの一覧など）を、外側を押したとき・Esc を押したときに閉じる。
// ref は「一覧とそれを開くボタンを囲む要素」に付ける（ボタンを押したときに、閉じてすぐ開き直さないように）。

import { useEffect, useRef, type RefObject } from 'react'

export function useDismissOnOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  open: boolean,
  onDismiss: () => void
) {
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      // 押した場所が囲みの外なら閉じる
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onDismissRef.current()
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismissRef.current()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [ref, open])
}
