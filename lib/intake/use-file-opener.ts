'use client'

// 受付のファイルを「開く」カスタムフック（docs/intake/screen-design.md「DXF を開く」）。
//
// サーバーでダウンロード用の期限つきの URL を作り（Server Action の createIntakeFileDownloadUrl）、
// ブラウザでその URL を開いてダウンロードする。ダウンロードしたファイルは、パソコンの関連付けで図面ソフトが開く
// （初回だけ、ブラウザで「この種類のファイルを常に開く」を設定する）。
// URL は 60 秒で切れるため、押すたびに作り直す。

import { useState } from 'react'
import { createIntakeFileDownloadUrl } from '@/app/(main)/intake/actions'

export function useFileOpener() {
  // 開いている途中のファイルの id（ボタンを「開いています…」にする）
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
    // 今の画面のまま、ダウンロードを始める（URL に download の指定があるため、画面は移らない）
    window.location.assign(result.url)
  }

  return { open, openingId, error }
}
