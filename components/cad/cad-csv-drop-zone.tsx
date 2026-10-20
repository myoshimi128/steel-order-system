'use client'

// CAD の CSV のドロップ枠（画面イメージ 05 の右下の点線の枠）。
// 枠の上に CSV を落とすか、枠を押してファイルを選ぶ（複数可）。入れた時点で保存する。
// 枠は <label htmlFor> にしてあり、押すと隠したファイルの欄（CAD_CSV_INPUT_ID。components/cad/cad-screen.tsx）が開く。
//   ・作業中の行: 1 つ目の CSV で受注登録待ちに移る
//   ・CSV 登録済の行: 足りなかった CSV の追加。同じ名前で入れると差し替える
// CSV の中身を注文内容の明細に読み込む処理は、受注システム側の今後の機能（今は保存だけ）。

import { useState, type DragEvent } from 'react'
import { Icon } from '@/components/layout/icon'
import type { CadUnit } from '@/lib/intake/types'
import { CAD_CSV_INPUT_ID, type CadBoard } from '@/lib/intake/use-cad-board'

export function CadCsvDropZone({ unit, board }: { unit: CadUnit; board: CadBoard }) {
  // ファイルを枠の上に持ってきている間は、枠の色を変える
  const [dragging, setDragging] = useState(false)
  const busy = board.busyUnitId === unit.id

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    // 既定の動き（ブラウザがファイルを開いてしまう）を止める
    event.preventDefault()
    setDragging(false)
    if (!busy && event.dataTransfer.files.length > 0) void board.uploadCsv(unit, event.dataTransfer.files)
  }

  return (
    <label
      htmlFor={CAD_CSV_INPUT_ID}
      onClick={(event) => {
        // 登録の途中は開かない（label には disabled がないため、既定の動きを止める）
        if (busy) {
          event.preventDefault()
          return
        }
        board.pickCsv(unit)
      }}
      onDragOver={(event) => {
        // dragover の既定の動きを止めないと、drop が起きない
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      aria-disabled={busy}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded border-2 border-dashed px-4 py-5 text-center ${
        busy ? 'opacity-60' : ''
      } ${dragging ? 'border-navy bg-navy-soft' : 'border-navy/30 bg-canvas/50 hover:bg-navy-soft/50'}`}
    >
      <Icon name="upload" className="h-5 w-5 text-navy" />
      <span className="text-sm font-semibold text-navy">
        {busy ? '登録しています…' : 'CAD から出力した CSV をここにドロップ'}
      </span>
      <span className="text-xs text-neutral-500">
        {unit.status === 'cad_working'
          ? '登録すると、受注登録待ちに「CSV 登録済」で並びます'
          : '足りなかった CSV を追加できます。同じ名前で入れると差し替えます'}
      </span>
      <span className="text-xs text-neutral-400">押して選ぶこともできます。中身の明細への読み込みは今後の機能です（今は保存のみ）</span>
    </label>
  )
}
