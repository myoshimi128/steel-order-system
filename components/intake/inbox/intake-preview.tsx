'use client'

// 受付待ち一覧の右側（画面イメージ 04a の右側）。選んだ行の中身と、その行への操作を出す。
//
//   受付待ち   : 差出人・受信日時・件名・本文（手動で追加した受付はメモ）・添付の一覧。
//                下に「対象外」「見積・ミルシート」「この内容で受付登録 →」
//   受付登録済 : 受付No.・受注情報の要約と添付。「受付の内容を直す」（処理区分 1 変更）と「振り分け（準備中）」
//   見積・ミルシート: 受付No.・中身と添付。「削除する」（処理区分 2 削除）
//   対象外     : 中身と添付。「受付待ちに戻す」
// ほかの人が対応中なら、上に「○○さんが対応中」を出す（止めずに、受付登録のときに確かめる）。

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Icon } from '@/components/layout/icon'
import { HandlingBadge } from '@/components/intake/handling-badge'
import { IntakeFileList } from '@/components/intake/intake-file-list'
import { formatReceivedAtLong } from '@/lib/intake/received-at'
import type { IntakeListRow } from '@/lib/intake/types'
import type { IntakeInbox } from '@/lib/intake/use-intake-inbox'

// 納期の表示（確定・仮納期は日付を付ける）
function dueDateText(row: IntakeListRow): string {
  if (!row.dueDateType) return '—'
  return row.dueDate ? `${row.dueDateType} ${row.dueDate.replaceAll('-', '/')}` : row.dueDateType
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 py-1 text-sm">
      <dt className="w-16 shrink-0 text-neutral-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  )
}

const SECONDARY_BUTTON =
  'rounded border border-line bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY_BUTTON =
  'flex items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-60'

export function IntakePreview({ inbox }: { inbox: IntakeInbox }) {
  const row = inbox.selected
  if (!row) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-neutral-500">
        左の一覧から受付を選んでください
      </div>
    )
  }

  const handling = inbox.handlingOf(row)
  const isRegistered = row.status !== 'waiting' && row.status !== 'excluded'
  // 本文がないとき（FAX・手動で追加した受付）はメモを出す
  const body = row.emailBody ?? row.memo

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-5 py-4">
        {handling.state === 'other' && (
          <div className="mb-3">
            <HandlingBadge label={handling.label} />
          </div>
        )}
        <dl>
          {row.intakeNo && (
            <InfoRow label="受付No.">
              <span className="font-bold tabular-nums">{row.intakeNo}</span>
              {row.isUrgent && <span className="ml-2 font-bold text-urgent">至急</span>}
            </InfoRow>
          )}
          <InfoRow label="差出人">{row.emailFrom ?? '—'}</InfoRow>
          <InfoRow label="受信">{formatReceivedAtLong(row.receivedAt)}</InfoRow>
          {isRegistered && (
            <>
              <InfoRow label="売り先">{row.customerName ?? '—'}</InfoRow>
              <InfoRow label="工事名">{row.projectName ?? '—'}</InfoRow>
              <InfoRow label="納期">{dueDateText(row)}</InfoRow>
              <InfoRow label="加工場所">{row.siteName ?? '—'}</InfoRow>
            </>
          )}
        </dl>
        {row.emailSubject && <p className="mt-2 text-base font-bold text-neutral-900">{row.emailSubject}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-line px-5 py-4">
          {row.emailBody === null && row.memo !== null && <p className="mb-1 text-xs text-neutral-500">メモ</p>}
          <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-800">{body ?? '（本文はありません）'}</p>
        </div>
        <div className="px-5 py-4">
          <p className="mb-2 text-xs font-semibold text-neutral-500">添付ファイル（{row.files.length}件）</p>
          <IntakeFileList files={row.files} />
        </div>
      </div>

      {inbox.error && (
        <p role="alert" className="border-t border-urgent/30 bg-urgent/5 px-5 py-2 text-sm text-urgent">
          {inbox.error}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        {row.status === 'waiting' && (
          <>
            <button type="button" onClick={() => inbox.classify('excluded')} disabled={inbox.pending} className={SECONDARY_BUTTON}>
              対象外
            </button>
            <button type="button" onClick={() => inbox.classify('estimate')} disabled={inbox.pending} className={SECONDARY_BUTTON}>
              見積・ミルシート
            </button>
            <button
              type="button"
              onClick={inbox.openRegistration}
              disabled={inbox.pending}
              className={`ml-auto ${PRIMARY_BUTTON}`}
            >
              この内容で受付登録
              <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          </>
        )}
        {row.status === 'excluded' && (
          <button type="button" onClick={() => inbox.classify('waiting')} disabled={inbox.pending} className={SECONDARY_BUTTON}>
            受付待ちに戻す
          </button>
        )}
        {row.status === 'registered' && row.intakeNo && (
          <>
            <Link href={`/intake/register?type=1&no=${row.intakeNo}`} className={SECONDARY_BUTTON}>
              受付の内容を直す
            </Link>
            {/* 振り分けの画面（S-04d）は PR 6 で作る */}
            <button type="button" disabled title="振り分けの画面は準備中です" className={`ml-auto ${PRIMARY_BUTTON}`}>
              振り分け（準備中）
            </button>
          </>
        )}
        {row.status === 'estimate' && row.intakeNo && (
          <Link href={`/intake/register?type=2&no=${row.intakeNo}`} className={SECONDARY_BUTTON}>
            削除する
          </Link>
        )}
      </div>
    </div>
  )
}
