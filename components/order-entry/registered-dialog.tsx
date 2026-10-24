'use client'

// 受注を登録した後に出す画面（docs/intake/screen-design.md「S-06d 注文内容」の「登録後に選ぶ」）。
// 1 つの加工区分から複数の受注（枝番）を登録できるため、登録のたびに次のどれかを選ぶ。
//   ・同じ区分で続けて登録     : 明細などを空にし、受注情報を受付の初期値に戻して ① 受注情報へ（次の枝番になる）
//   ・この区分の起票を完了     : complete_work_unit で受注登録待ちから外し、一覧に戻る
//   ・受注登録待ちに戻る       : 区分は一覧に残したまま戻る（あとで続きを登録する）
// 開いたら「同じ区分で続けて登録」にカーソルを置く（Enter で続けて登録できる）。
// 現場用伝票の印刷の画面は、登録と同時に新しいタブで開いている（order-entry-screen.tsx）。
// ブラウザに止められて開けなかったときや、もう一度印刷したいときのために、「現場用伝票を印刷」のボタンも置く。

import { useEffect, useRef } from 'react'

type RegisteredDialogProps = {
  orderNo: string
  intakeNo: string
  // 起票完了の途中
  completing: boolean
  error: string | null
  onContinue: () => void
  onComplete: () => void
  onBackToQueue: () => void
  // 登録と同時に印刷の画面を開けなかった（ブラウザに止められた）
  printTabBlocked: boolean
  // 印刷の画面を新しいタブで開く
  onPrintSlip: () => void
}

export function RegisteredDialog({
  orderNo,
  intakeNo,
  completing,
  error,
  onContinue,
  onComplete,
  onBackToQueue,
  printTabBlocked,
  onPrintSlip,
}: RegisteredDialogProps) {
  const continueRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    continueRef.current?.focus()
  }, [])

  const button = 'w-full rounded px-5 py-3 text-left text-sm disabled:opacity-60'

  return (
    // 画面全体を薄暗くして、その上に出す
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="registered-title"
        className="flex w-[520px] flex-col gap-4 rounded bg-white px-6 py-5 shadow-xl"
      >
        <div>
          <h2 id="registered-title" className="text-lg font-bold text-neutral-900">
            受注No. <span className="tabular-nums text-navy">{orderNo}</span> を登録しました
          </h2>
          <p className="mt-1 text-sm text-neutral-600">続けて登録するか、受付No. {intakeNo} のこの区分の起票を完了するかを選んでください。</p>
        </div>

        {/* 現場用伝票の印刷（登録と同時に新しいタブで開いている。止められたときはここから開く） */}
        <div
          className={`flex items-center justify-between gap-3 rounded border px-4 py-2.5 text-sm ${
            printTabBlocked ? 'border-attention/40 bg-attention-soft text-attention' : 'border-line bg-canvas text-neutral-700'
          }`}
        >
          <span>
            {printTabBlocked
              ? '印刷の画面を開けませんでした（ブラウザに止められました）。右のボタンから開いてください'
              : '現場用伝票の印刷の画面を新しいタブで開きました'}
          </span>
          <button
            type="button"
            onClick={onPrintSlip}
            disabled={completing}
            className="shrink-0 rounded border border-navy bg-white px-3 py-1.5 text-sm font-semibold text-navy hover:bg-navy-soft disabled:opacity-60"
          >
            現場用伝票を印刷
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            disabled={completing}
            className={`${button} bg-navy font-bold text-white hover:bg-navy-hover`}
          >
            同じ区分で続けて登録
            <span className="block text-xs font-normal text-white/80">受注情報を受付の値に戻して、次の枝番の受注を入力します</span>
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={completing}
            className={`${button} border border-line font-semibold text-neutral-800 hover:bg-canvas`}
          >
            {completing ? '起票を完了しています…' : 'この区分の起票を完了'}
            <span className="block text-xs font-normal text-neutral-500">受注登録待ちから外して、一覧に戻ります</span>
          </button>
          <button
            type="button"
            onClick={onBackToQueue}
            disabled={completing}
            className={`${button} border border-line text-neutral-700 hover:bg-canvas`}
          >
            受注登録待ちに戻る
            <span className="block text-xs text-neutral-500">この区分は一覧に残します（あとで続きを登録できます）</span>
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded border border-urgent/30 bg-urgent/5 px-3 py-2 text-sm text-urgent">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
