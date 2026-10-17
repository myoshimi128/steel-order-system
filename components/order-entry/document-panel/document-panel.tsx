'use client'

// 受注登録の画面の左に置く「注文書のパネル」（docs/screen-design.md「注文書のパネル」）。
//   ・右端のつまみをドラッグして幅を変えられる（幅は cookie に保存する）
//   ・F2 またはパネルの上のボタンで開閉する。閉じると細い帯だけになる
//   ・受付の機能ができるまでは、注文書がシステムに入っていないため「注文書はまだありません」とだけ出す。
//     受付の機能ができたら、受付に保存された注文書 PDF をブラウザの PDF の表示機能で埋め込んで表示する
//     （拡大・スクロール・ページ送りはブラウザの機能をそのまま使う）
// 幅と開閉の状態は useDocumentPanel が持ち、この部品は表示だけを担当する。

import type { DocumentPanelState } from '@/lib/order-entry/use-document-panel'

export function DocumentPanel({ panel }: { panel: DocumentPanelState }) {
  if (!panel.open) {
    return (
      <button
        type="button"
        // マウスで開く。テンキーの入力の流れには含めない（F2 でも開ける）
        tabIndex={-1}
        onClick={panel.toggle}
        title="注文書を開く（F2）"
        className="flex w-8 shrink-0 flex-col items-center gap-2 rounded border border-line bg-white py-3 text-xs text-neutral-600 hover:bg-navy-soft"
      >
        <span aria-hidden="true">»</span>
        <span className="[writing-mode:vertical-rl]">注文書</span>
      </button>
    )
  }

  return (
    <aside
      style={{ width: panel.width }}
      className="relative flex shrink-0 flex-col rounded border border-line bg-white"
    >
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold text-navy">注文書（PDF）</h2>
        <button
          type="button"
          tabIndex={-1}
          onClick={panel.toggle}
          className="rounded px-2 py-0.5 text-xs text-neutral-600 hover:bg-canvas"
        >
          « 閉じる（F2）
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-canvas p-4 text-center">
        <p className="text-sm text-neutral-500">注文書はまだありません</p>
        <p className="text-xs text-neutral-400">受付の機能ができると、受付に保存された注文書をここに表示します</p>
      </div>

      {/* 右端のつまみ。ドラッグで幅を変える */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="注文書のパネルの幅を変える"
        onPointerDown={panel.startResize}
        className="absolute -right-2 top-0 h-full w-3 cursor-col-resize after:absolute after:left-1/2 after:top-1/2 after:h-10 after:w-1 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded after:bg-neutral-300 hover:after:bg-navy"
      />
    </aside>
  )
}
