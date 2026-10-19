// 処理区分「2 削除」で呼び出した受付の内容（表示のみ）。
// 削除する前に、どの受付かを確かめられるようにする。

import type { ReactNode } from 'react'
import { INTAKE_STATUS_LABELS } from '@/lib/intake/constants'
import type { IntakeDetail } from '@/lib/intake/types'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-line py-2.5 text-sm last:border-b-0">
      <dt className="w-24 shrink-0 text-neutral-500">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

export function IntakeDeleteSummary({ intake }: { intake: IntakeDetail }) {
  const dueDate = intake.dueDateType
    ? `${intake.dueDateType}${intake.dueDate ? ` ${intake.dueDate.replaceAll('-', '/')}` : ''}`
    : '—'
  return (
    <div>
      <p className="mb-3 rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent">
        この受付を削除します。削除した受付は一覧に出なくなります（記録は残ります）。
      </p>
      <dl>
        <Row label="受付No.">
          <span className="font-bold tabular-nums">{intake.intakeNo}</span>
        </Row>
        <Row label="状態">{INTAKE_STATUS_LABELS[intake.status]}</Row>
        <Row label="売り先">{intake.customerName ?? '—'}</Row>
        <Row label="工事名">{intake.projectName ?? '—'}</Row>
        <Row label="納期">{dueDate}</Row>
        <Row label="加工場所">{intake.siteName ?? '—'}</Row>
      </dl>
    </div>
  )
}
