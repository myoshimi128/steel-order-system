// 現場用伝票の上部の、納期の枠（受注No. の右に、受注No. と同じくらいの大きさの太字で出す）。
//
//   確定          : 「10/30（金）  宵積み」を黒の太い実線で囲む
//   仮納期        : 「［仮］10/30（金）  宵積み」。「仮」を黒地に白抜きで出し、枠を破線にする
//   後報・最短出荷 : 日付の代わりに「後報」「最短出荷」を同じ大きさで出す
// 白黒で印刷しても見分けられるよう、色は使わず、黒地の白抜きと線の形（実線か破線か）で区別する。
// 文の組み立ては lib/order-slip/slip-format.ts の slipDueDate。

import type { SlipDueDate as SlipDueDateValue } from '@/lib/order-slip/slip-format'

type SlipDueDateProps = {
  dueDate: SlipDueDateValue
}

export function SlipDueDate({ dueDate }: SlipDueDateProps) {
  return (
    <div
      className={`flex shrink-0 items-center gap-2 border-[3px] border-neutral-900 px-2 py-0.5 ${
        dueDate.provisional ? 'border-dashed' : ''
      }`}
    >
      <span className="text-xs font-semibold text-neutral-700">納期</span>
      {dueDate.provisional && (
        <span className="rounded bg-neutral-900 px-1.5 text-xl font-black text-white">仮</span>
      )}
      <span className="whitespace-nowrap text-3xl font-black tabular-nums tracking-wide text-neutral-900">
        {dueDate.main}
      </span>
      {/* 配達は日付の右に、ひと回り小さい太字で並べる。長いフリーの文字は枠からはみ出さないよう切る */}
      {dueDate.delivery && (
        <span className="max-w-[45mm] truncate text-xl font-bold text-neutral-900">{dueDate.delivery}</span>
      )}
    </div>
  )
}
