'use client'

// 注文書のパネルの幅と開閉を持つカスタムフック（docs/screen-design.md「注文書のパネル」）。
// 幅の決め方は document-panel-state.ts の純粋な関数に任せ、ここでは次のことだけを行う。
//   ・画面の中身の幅を測る（ResizeObserver）。パネルの最大の幅が画面の幅で決まるため
//   ・つまみのドラッグで幅を変え、離したときに cookie に保存する
//   ・F2 で開閉し、開閉の状態を cookie に保存する

import { useCallback, useEffect, useState, type PointerEvent } from 'react'
import {
  displayPanelWidth,
  DOCUMENT_PANEL_MIN_WIDTH,
  maxPanelWidth,
  panelOpenCookieString,
  panelWidthCookieString,
} from './document-panel-state'

// 画面の幅を測る前（サーバーでの描画）に使う幅。1280px の画面で取れる最大の幅に合わせる
const FALLBACK_WIDTH = 326

// container: パネルと右の中身を並べる枠の要素。この幅からパネルの最大の幅を求める
//   （呼び出し側が useState の setter を ref に渡して受け取る。描画中に ref を読まないようにするため）
// initialWidth / initialOpen: サーバー（page.tsx）が cookie から読んだ、保存されている幅と開閉
export function useDocumentPanel(
  container: HTMLDivElement | null,
  initialWidth: number | null,
  initialOpen: boolean,
) {
  const [containerWidth, setContainerWidth] = useState<number | null>(null)
  const [savedWidth, setSavedWidth] = useState<number | null>(initialWidth)
  const [open, setOpen] = useState(initialOpen)

  // 枠の幅を測り、ブラウザの大きさが変わったら測り直す
  useEffect(() => {
    if (!container) {
      return
    }
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [container])

  const width =
    containerWidth === null
      ? (savedWidth ?? FALLBACK_WIDTH)
      : displayPanelWidth(savedWidth, containerWidth)

  // 開閉する。開閉の状態は cookie に保存する
  const toggle = useCallback(() => {
    setOpen((current) => {
      const next = !current
      document.cookie = panelOpenCookieString(next)
      return next
    })
  }, [])

  // F2 で開閉する（どの欄にいても効くよう、画面全体で受け取る）
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'F2') {
        event.preventDefault()
        toggle()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggle])

  // つまみのドラッグで幅を変える。動かしている間は画面の幅に収めた値を表示し、離したときに保存する
  function startResize(event: PointerEvent<HTMLElement>) {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = width
    const max = containerWidth === null ? startWidth : maxPanelWidth(containerWidth)
    let latest = startWidth

    function handleMove(moveEvent: globalThis.PointerEvent) {
      latest = Math.min(max, Math.max(DOCUMENT_PANEL_MIN_WIDTH, startWidth + moveEvent.clientX - startX))
      setSavedWidth(latest)
    }
    function handleUp() {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      document.cookie = panelWidthCookieString(latest)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return { width, open, toggle, startResize }
}

export type DocumentPanelState = ReturnType<typeof useDocumentPanel>
