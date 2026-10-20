'use client'

// 今の時刻を持ち、intervalMs ごとに更新するカスタムフック。
// 「開始から 30 分たったら対応中を外す」のように、時間がたつと表示が変わるものに使う。
// 描画のたびに new Date() を読むと、同じ内容でも描画ごとに結果が変わってしまうため、時刻は state に持つ。

import { useEffect, useState } from 'react'

export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
