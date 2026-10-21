'use client'

// 受注登録の画面の左に置く「注文書のパネル」（docs/screen-design.md「注文書のパネル」）。
//   ・右端のつまみをドラッグして幅を変えられる（幅は cookie に保存する）
//   ・F2 またはパネルの上のボタンで開閉する。閉じると細い帯だけになる
//   ・中身は受付の DocumentViewer（components/intake/document-viewer/document-viewer.tsx）。
//     「注文書（PDF）」のタブに受付の注文書 PDF を埋め込んで表示し（拡大・スクロール・ページ送りはブラウザの機能をそのまま使う）、
//     「図面データ」のタブに、この加工区分のファイル（振り分けた図面・追加分・CAD の CSV）だけを出す
// 幅と開閉の状態は useDocumentPanel が持ち、この部品は表示だけを担当する。

import { DocumentViewer } from '@/components/intake/document-viewer/document-viewer'
import type { IntakeFile } from '@/lib/intake/types'
import type { DocumentPanelState } from '@/lib/order-entry/use-document-panel'

type DocumentPanelProps = {
  panel: DocumentPanelState
  // 受付の注文書 PDF と、この加工区分のファイル（lib/intake/load-order-intake-source.ts）
  files: readonly IntakeFile[]
}

export function DocumentPanel({ panel, files }: DocumentPanelProps) {
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
        <h2 className="text-sm font-semibold text-navy">注文書・図面</h2>
        <button
          type="button"
          tabIndex={-1}
          onClick={panel.toggle}
          className="rounded px-2 py-0.5 text-xs text-neutral-600 hover:bg-canvas"
        >
          « 閉じる（F2）
        </button>
      </div>

      {/* 受付の画面と同じ部品を、パネルの高さいっぱいに広げる（パネル自身に枠線があるため、部品の枠線は消す） */}
      <DocumentViewer files={files} className="flex-1 rounded-none border-0" />

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
