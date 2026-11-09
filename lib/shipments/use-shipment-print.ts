'use client'

// 送り状の印刷の流れ（印刷の画面の「印刷」のボタンと、発行の直後の自動の印刷）。
// 現場用伝票（lib/order-slip/use-slip-print.ts）と違い、印刷の記録は残さない（4 部はいつも同じ中身のため、
// 何回目かを紙に出す必要がない）。ブラウザの印刷の画面を出すだけ。

import { useCallback, useEffect, useRef } from 'react'

export function useShipmentPrint(auto: boolean) {
  const print = useCallback(() => {
    window.print()
  }, [])

  // 発行の直後に開いたときは、すぐに印刷する。開発中の StrictMode で effect が 2 回動いても 1 回だけにする
  const autoStarted = useRef(false)
  useEffect(() => {
    if (!auto || autoStarted.current) return
    autoStarted.current = true
    // 開き直したとき（再読み込み）にもう一度印刷しないよう、URL から auto を外しておく
    const url = new URL(window.location.href)
    url.searchParams.delete('auto')
    window.history.replaceState(null, '', url.toString())
    print()
  }, [auto, print])

  return { print }
}
