'use client'

// 現場用伝票の印刷の流れ（印刷の画面の「印刷」のボタンと、登録の直後の自動の印刷）。
//
//   1. 印刷を記録して（recordSlipPrint）、何回目の印刷かを受け取る
//   2. 受け取った回数を伝票の「発行 n 回目」に出す（flushSync で、印刷の前に画面へ反映し終える）
//   3. ブラウザの印刷の画面を出す（window.print）
// 記録できなかった（削除された受注など）ときは印刷せず、理由を出す。
//
// Ctrl+P（ブラウザのメニュー）で印刷したときも記録する。印刷の画面が出る直前（beforeprint）に記録を送り、
// 伝票には予定の回数（これまでの回数 + 1）を出したまま印刷する。後から返ってきた回数で表示を合わせる。

import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { recordSlipPrint } from '@/app/(print)/orders/print/actions'
import type { SlipCopyKind } from './types'

export function useSlipPrint(params: {
  orderId: string
  copyKind: SlipCopyKind
  // これまでに印刷した回数（この伝票の種類）
  initialCount: number
  // 開いたらすぐに印刷する（登録の直後）
  auto: boolean
}) {
  const { orderId, copyKind, initialCount, auto } = params
  // 伝票に出す回数。印刷する前は予定の回数（これまでの回数 + 1）、印刷した後はその印刷の回数
  const [issueCount, setIssueCount] = useState(initialCount + 1)
  const [printing, setPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ボタンから印刷している途中か（beforeprint で二重に記録しないため）
  const printingByButton = useRef(false)

  const print = useCallback(async () => {
    if (printingByButton.current) return
    printingByButton.current = true
    setPrinting(true)
    setError(null)
    try {
      const result = await recordSlipPrint(orderId, copyKind)
      if (!result.ok) {
        setError(result.message)
        return
      }
      // 回数を画面に反映し終えてから、印刷の画面を出す
      flushSync(() => setIssueCount(result.count))
      window.print()
    } finally {
      printingByButton.current = false
      setPrinting(false)
    }
  }, [orderId, copyKind])

  // Ctrl+P などで印刷したときも記録する
  useEffect(() => {
    function handleBeforePrint() {
      if (printingByButton.current) return
      void recordSlipPrint(orderId, copyKind).then((result) => {
        if (result.ok) setIssueCount(result.count)
        else setError(result.message)
      })
    }
    window.addEventListener('beforeprint', handleBeforePrint)
    return () => window.removeEventListener('beforeprint', handleBeforePrint)
  }, [orderId, copyKind])

  // 登録の直後に開いたときは、すぐに印刷する。開発中の StrictMode で effect が 2 回動いても 1 回だけにする
  const autoStarted = useRef(false)
  useEffect(() => {
    if (!auto || autoStarted.current) return
    autoStarted.current = true
    // 開き直したとき（再読み込み）にもう一度印刷しないよう、URL から auto を外しておく
    const url = new URL(window.location.href)
    url.searchParams.delete('auto')
    window.history.replaceState(null, '', url.toString())
    void print()
  }, [auto, print])

  return { issueCount, printing, error, print }
}
