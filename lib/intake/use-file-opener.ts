'use client'

// 受付のファイルを「開く」「すべて開く」カスタムフック（docs/intake/screen-design.md「DXF を開く」）。
//
// サーバーでダウンロード用の期限つきの URL を作り（Server Action）、ブラウザでその URL からダウンロードする。
// ダウンロードしたファイルは、パソコンの関連付けで図面ソフトが開く
// （初回だけ、ブラウザで「この種類のファイルを常に開く」を設定する）。
// URL は 60 秒で切れるため、押すたびに作り直す。
//
// 「すべて開く」は、URL をまとめて作り、少しずつ間を空けて 1 つずつダウンロードする
// （一度に始めると、ブラウザが途中のダウンロードを取り消すことがあるため）。
// 初回だけ、ブラウザが「複数のファイルのダウンロードを許可しますか」と聞いてくる。

import { useState } from 'react'
import { createIntakeFileDownloadUrl, createIntakeFileDownloadUrls } from '@/app/(main)/intake/actions'

// 「すべて開く」で、次のダウンロードを始めるまでの間（ミリ秒）
const DOWNLOAD_INTERVAL_MS = 600

// URL からダウンロードを始める。見えないリンクを作って押す
// （URL に download の指定があるため、画面は移らずにダウンロードになる）
function startDownload(url: string) {
  const link = document.createElement('a')
  link.href = url
  link.rel = 'noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function useFileOpener() {
  // 開いている途中のファイルの id（ボタンを「開いています…」にする）。すべて開くの途中は 'all'
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function open(fileId: string) {
    setOpeningId(fileId)
    setError(null)
    const result = await createIntakeFileDownloadUrl(fileId)
    setOpeningId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    startDownload(result.url)
  }

  async function openAll(fileIds: readonly string[]) {
    if (fileIds.length === 0) return
    setOpeningId('all')
    setError(null)
    const result = await createIntakeFileDownloadUrls([...fileIds])
    if (!result.ok) {
      setOpeningId(null)
      setError(result.error)
      return
    }
    for (const [index, url] of result.urls.entries()) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, DOWNLOAD_INTERVAL_MS))
      startDownload(url)
    }
    setOpeningId(null)
    if (result.urls.length < fileIds.length) {
      setError(`${fileIds.length - result.urls.length} 件のファイルを開けませんでした`)
    }
  }

  return { open, openAll, openingId, error }
}
