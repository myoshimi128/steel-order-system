// 現場用伝票の右の欄（現場への指示）。どのページにも同じものを出す（伝票が工程の間でばらけても指示が読めるように）。
//
//   ショット加工: スプライス専用の受注でショットが有のとき、先頭に黒地に白の太字で出す（orders.splice_shot から。スタンプには保存しない）
//   材質ライン  : 明細に材質ラインのある材質があれば、材質ごとにまとめて出す（例: SN490C 青2本）
//   スタンプ    : チェックした文言を番号順に、太い枠の中に並べる
//   摘要        : フリーコメント（orders.field_note）。入力した改行をそのまま出す

import type { SlipLineMarkSummary } from '@/lib/order-slip/slip-lines'

type SlipInstructionsProps = {
  shot: boolean
  lineMarks: readonly SlipLineMarkSummary[]
  stamps: readonly { number: number; body: string }[]
  fieldNote: string | null
}

export function SlipInstructions({ shot, lineMarks, stamps, fieldNote }: SlipInstructionsProps) {
  return (
    <aside className="flex min-h-0 flex-col gap-2">
      {shot && (
        <p className="rounded bg-neutral-900 py-2 text-center text-xl font-black tracking-widest text-white">ショット加工</p>
      )}

      {lineMarks.length > 0 && (
        <section className="border-2 border-neutral-900 px-2 py-1.5">
          <h2 className="text-xs font-bold text-neutral-700">材質ライン</h2>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {lineMarks.map((mark) => (
              <li
                key={mark.materialName}
                className="pl-2 text-sm font-bold"
                style={{ borderLeft: `5px solid ${mark.color ?? '#171717'}` }}
              >
                {mark.materialName} {mark.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="border-2 border-neutral-900 px-2 py-1.5">
        <h2 className="text-xs font-bold text-neutral-700">スタンプ</h2>
        {stamps.length === 0 && !shot ? (
          <p className="mt-0.5 text-sm text-neutral-500">なし</p>
        ) : (
          <ul className="mt-0.5 flex flex-col gap-1">
            {/* ショット加工はスタンプの枠の先頭にも出す（受注登録の画面で自動で付くスタンプと同じ並び） */}
            {shot && <li className="text-sm font-black">ショット加工</li>}
            {stamps.map((stamp) => (
              <li key={stamp.number} className="text-sm font-bold leading-snug">
                {stamp.body}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex min-h-[30mm] flex-1 flex-col border border-neutral-900 px-2 py-1.5">
        <h2 className="text-xs font-bold text-neutral-700">摘要</h2>
        {/* 改行をそのまま出す（whitespace-pre-wrap）。長い行は欄の幅で折り返す */}
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-snug">{fieldNote ?? ''}</p>
      </section>
    </aside>
  )
}
