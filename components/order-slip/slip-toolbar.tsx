'use client'

// 印刷の画面の上の帯（画面だけに出し、印刷には出さない。print:hidden）。
//
//   ・伝票の種類の切り替え（現場用 / 単価記入用）。切り替えると、その種類の伝票の画面を開き直す
//   ・「印刷」のボタン（印刷を記録してから、ブラウザの印刷の画面を出す。use-slip-print.ts）
//   ・前回の印刷の後に受注が変更されていたら、その知らせ（印刷し直しを促す）
//   ・印刷できなかった理由

import Link from 'next/link'
import { formatJapanDateTime, SLIP_COPY_KINDS, slipPrintHref } from '@/lib/order-slip/slip-format'
import type { SlipCopyKind } from '@/lib/order-slip/types'
import { orderEditHref } from '@/lib/order-entry/order-no'

type SlipToolbarProps = {
  orderNo: string
  copyKind: SlipCopyKind
  printing: boolean
  error: string | null
  // 前回の印刷の日時（印刷したことがなければ null）と、その後に受注が変更されたか
  lastPrintedAt: string | null
  changedSinceLastPrint: boolean
  onPrint: () => void
}

export function SlipToolbar({
  orderNo,
  copyKind,
  printing,
  error,
  lastPrintedAt,
  changedSinceLastPrint,
  onPrint,
}: SlipToolbarProps) {
  return (
    <div className="flex flex-col gap-2 print:hidden">
      <div className="flex items-center gap-4 rounded border border-line bg-white px-5 py-3">
        <div className="flex flex-col">
          <span className="text-xs text-neutral-500">現場用伝票の印刷</span>
          <span className="text-lg font-bold tabular-nums text-neutral-900">受注No. {orderNo}</span>
        </div>

        {/* 伝票の種類の切り替え */}
        <nav aria-label="伝票の種類" className="flex overflow-hidden rounded border border-line">
          {SLIP_COPY_KINDS.map((kind) => (
            <Link
              key={kind}
              href={slipPrintHref({ no: orderNo, copy: kind })}
              aria-current={kind === copyKind ? 'page' : undefined}
              className={`px-4 py-2 text-sm ${
                kind === copyKind ? 'bg-navy font-semibold text-white' : 'bg-white text-neutral-700 hover:bg-canvas'
              }`}
            >
              {kind}
              <span className="ml-1 text-xs opacity-80">{kind === '現場用' ? '（単価なし）' : '（単価・金額あり）'}</span>
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-neutral-500">
            {lastPrintedAt ? `前回の印刷 ${formatJapanDateTime(lastPrintedAt)}` : 'まだ印刷していません'}
          </span>
          <Link
            href={orderEditHref({})}
            className="rounded border border-line bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-canvas"
          >
            受注No. で呼び出す
          </Link>
          <button
            type="button"
            onClick={onPrint}
            disabled={printing}
            className="rounded bg-navy px-6 py-2 text-sm font-semibold text-white hover:bg-navy-hover disabled:opacity-60"
          >
            {printing ? '印刷の準備中…' : '印刷'}
          </button>
        </div>
      </div>

      {changedSinceLastPrint && (
        <p role="status" className="rounded border border-attention/40 bg-attention-soft px-4 py-2.5 text-sm font-semibold text-attention">
          前回の印刷の後に受注が変更されています。現場にある伝票は古い内容のため、印刷し直して差し替えてください
        </p>
      )}
      {error && (
        <p role="alert" className="rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent">
          {error}
        </p>
      )}
    </div>
  )
}
