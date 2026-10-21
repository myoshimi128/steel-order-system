'use client'

// DocumentViewer（docs/intake/screen-design.md「共通の部品」の DocumentViewer。受付登録 S-04c の左側）。
//   ・タブ「注文書（PDF）」: 注文書の PDF を画面の中に表示する。PDF が複数あれば、上で切り替える
//     ページ送り・拡大・印刷は、ブラウザの PDF の表示機能をそのまま使う（自作しない）。「別ウィンドウ」で新しいタブに開ける
//   ・タブ「図面データ（件数）」: PDF 以外のファイル（DXF など）の一覧と「開く」（ダウンロード → 図面ソフトが開く）。
//     2 件以上あれば「すべて図面ソフトで開く」も出す
// 受注登録の画面の注文書のパネル（components/order-entry/document-panel/document-panel.tsx）にも置く（PR 9）。
// className で外枠の見た目を足せる（パネルの中では枠線を消して高さいっぱいに広げる）。

import { useState } from 'react'
import { Icon } from '@/components/layout/icon'
import { IntakeFileList } from '@/components/intake/intake-file-list'
import { isPdf } from '@/lib/intake/attachments'
import type { IntakeFile } from '@/lib/intake/types'

type ViewerTab = 'pdf' | 'drawings'

export function DocumentViewer({ files, className = '' }: { files: readonly IntakeFile[]; className?: string }) {
  const pdfs = files.filter((file) => isPdf(file.originalName))
  const drawings = files.filter((file) => !isPdf(file.originalName))

  // PDF がなく図面だけの受付は、図面データのタブから開く
  const [tab, setTab] = useState<ViewerTab>(pdfs.length === 0 && drawings.length > 0 ? 'drawings' : 'pdf')
  const [pdfId, setPdfId] = useState<string | null>(pdfs[0]?.id ?? null)
  const currentPdf = pdfs.find((file) => file.id === pdfId) ?? pdfs[0] ?? null

  const tabClass = (active: boolean) =>
    `-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm ${
      active ? 'border-navy font-bold text-navy' : 'border-transparent text-neutral-600 hover:text-neutral-900'
    }`

  return (
    <section className={`flex min-h-0 flex-col rounded border border-line bg-white ${className}`}>
      <div role="tablist" aria-label="受付のファイル" className="flex gap-1 border-b border-line px-3">
        <button type="button" role="tab" aria-selected={tab === 'pdf'} onClick={() => setTab('pdf')} className={tabClass(tab === 'pdf')}>
          <Icon name="paperclip" className="h-4 w-4" />
          注文書（PDF）
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'drawings'}
          onClick={() => setTab('drawings')}
          className={tabClass(tab === 'drawings')}
        >
          図面データ
          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-bold text-neutral-600">{drawings.length}</span>
        </button>
      </div>

      {tab === 'pdf' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {currentPdf ? (
            <>
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                {pdfs.length > 1 ? (
                  // PDF が複数あるときは、どれを表示するかを選ぶ
                  <select
                    value={currentPdf.id}
                    onChange={(event) => setPdfId(event.target.value)}
                    className="min-w-0 flex-1 rounded border border-line px-2 py-1 text-sm"
                  >
                    {pdfs.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.originalName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold" title={currentPdf.originalName}>
                    {currentPdf.originalName}
                  </span>
                )}
                {currentPdf.viewUrl && (
                  <a
                    href={currentPdf.viewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex shrink-0 items-center gap-1 rounded border border-line px-2 py-1 text-xs hover:bg-canvas"
                  >
                    <Icon name="external" className="h-3.5 w-3.5" />
                    別ウィンドウ
                  </a>
                )}
              </div>
              {currentPdf.viewUrl ? (
                // iframe（画面の中に別のページを埋め込む枠）で、ブラウザの PDF の表示機能を使う
                <iframe
                  key={currentPdf.id}
                  src={currentPdf.viewUrl}
                  title={`注文書 ${currentPdf.originalName}`}
                  className="min-h-0 w-full flex-1 bg-canvas"
                />
              ) : (
                <p className="flex flex-1 items-center justify-center p-6 text-sm text-neutral-500">
                  注文書を表示できません。画面を開き直してください
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1 bg-canvas p-6 text-center">
              <p className="text-sm text-neutral-500">注文書の PDF はありません</p>
              {drawings.length > 0 && <p className="text-xs text-neutral-400">図面データのタブで添付を確認できます</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <IntakeFileList files={drawings} emptyText="図面データはありません" showOpenAll={drawings.length > 1} />
          {drawings.length > 0 && (
            <p className="text-xs leading-5 text-neutral-500">
              「開く」でダウンロードし、パソコンの図面ソフトで開きます。初回だけ、ブラウザのダウンロードの一覧で
              「この種類のファイルを常に開く」を選んでおくと、次からはすぐに図面ソフトが起動します。
              「すべて開く」の初回は、ブラウザが複数のファイルのダウンロードを許可するか聞いてくるので、許可してください。
            </p>
          )}
        </div>
      )}
    </section>
  )
}
