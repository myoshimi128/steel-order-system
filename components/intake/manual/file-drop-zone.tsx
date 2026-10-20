'use client'

// ファイルをドロップする枠（手動で受付を追加の「注文書」。画面イメージ 04b）。
// 枠の上にファイルを落とすか、枠を押してファイルを選ぶ。複数のファイルを一度に入れられる。
// 入れたファイルは枠の下に並べ、× で外せる。入れられなかったファイル（PDF・DXF 以外、50MB 超）は理由を出す。

import { useRef, useState, type DragEvent } from 'react'
import { Icon } from '@/components/layout/icon'
import { formatFileSize } from '@/lib/intake/attachments'
import { UPLOAD_ACCEPT } from '@/lib/intake/upload-rules'

type FileDropZoneProps = {
  files: readonly File[]
  rejected: readonly { name: string; reason: string }[]
  onAdd: (files: FileList) => void
  onRemove: (name: string) => void
  disabled?: boolean
}

export function FileDropZone({ files, rejected, onAdd, onRemove, disabled = false }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // ファイルを枠の上に持ってきている間は、枠の色を変える
  const [dragging, setDragging] = useState(false)

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    // 既定の動き（ブラウザがファイルを開いてしまう）を止める
    event.preventDefault()
    setDragging(false)
    if (!disabled && event.dataTransfer.files.length > 0) onAdd(event.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          // dragover の既定の動きを止めないと、drop が起きない
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={disabled}
        className={`flex flex-col items-center gap-1.5 rounded border-2 border-dashed px-4 py-6 text-center ${
          dragging ? 'border-navy bg-navy-soft' : 'border-navy/30 bg-canvas/50 hover:bg-navy-soft/50'
        }`}
      >
        <Icon name="upload" className="h-5 w-5 text-navy" />
        <span className="text-sm font-semibold text-navy">PDF・DXF をここにドロップ</span>
        <span className="text-xs text-neutral-500">押してファイルを選ぶこともできます。ファイルがなくても登録できます</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) onAdd(event.target.files)
          // 同じファイルをもう一度選んでも onChange が起きるよう、選んだ内容を空に戻す
          event.target.value = ''
        }}
      />

      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((file) => (
            <li key={file.name} className="flex items-center gap-2 rounded border border-line px-3 py-1.5 text-sm">
              <Icon name="paperclip" className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="text-xs text-neutral-400">{formatFileSize(file.size)}</span>
              <button
                type="button"
                onClick={() => onRemove(file.name)}
                disabled={disabled}
                className="rounded p-1 text-neutral-400 hover:bg-canvas hover:text-neutral-700"
              >
                <Icon name="x" className="h-3.5 w-3.5" />
                <span className="sr-only">{file.name} を外す</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {rejected.length > 0 && (
        <ul role="alert" className="flex flex-col gap-0.5 text-xs text-urgent">
          {rejected.map((item) => (
            <li key={item.name}>
              {item.name}: {item.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
