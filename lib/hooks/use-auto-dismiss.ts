'use client'

// 一定の時間がたったら閉じる（新着のお知らせの 5 秒）。
// paused の間（マウスを乗せている間）は数えるのを止め、離したらもう一度最初から数える。

import { useEffect, useRef } from 'react'

export function useAutoDismiss(onDismiss: () => void, delayMs: number, paused: boolean) {
  // 閉じる処理は描画のたびに新しい関数になるため、ref に入れて、タイマーを作り直さずに最新のものを呼ぶ
  const onDismissRef = useRef(onDismiss)
  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => onDismissRef.current(), delayMs)
    // 止めた・閉じたときはタイマーを消す
    return () => clearTimeout(timer)
  }, [delayMs, paused])
}
