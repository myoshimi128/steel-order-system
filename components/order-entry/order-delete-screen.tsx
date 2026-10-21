'use client'

// 受注の削除（処理区分 2 削除。PR 9b）。受注No. で呼び出した受注の要約を表示だけで出し、確かめてから論理削除する。
//   ・受注No.・受付No.（区分）・売り先・工事名・納期・加工場所・明細の行数・加工区分の今の状態
//   ・削除しても加工区分・受付の状態は自動では戻さない（起票をやり直すときは「受注登録待ちに追加」で区分を足す）
//   ・削除した受注No. の枝番は使い回さない
// 送り状がある受注は、この画面を出す前に断っている（DB の関数 delete_order でも断る）。

import { useRouter } from 'next/navigation'
import { useState, useTransition, type ReactNode } from 'react'
import { deleteOrder } from '@/app/(main)/orders/edit/actions'
import { WORK_UNIT_KIND_LABELS, WORK_UNIT_STATUS_LABELS } from '@/lib/intake/constants'
import { longDueDateText } from '@/lib/intake/cad'
import type { DueDateType } from '@/lib/order-entry/constants'
import type { LoadedOrder } from '@/lib/order-entry/load-order-for-edit'
import { orderEditHref } from '@/lib/order-entry/order-no'

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-line py-2 last:border-b-0">
      <dt className="w-28 shrink-0 text-neutral-500">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

export function OrderDeleteScreen({ order, intakeNo }: { order: LoadedOrder; intakeNo: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const processCount = order.items.reduce((sum, item) => sum + item.processes.length, 0)
  const unitLabel = order.workUnitKind ? WORK_UNIT_KIND_LABELS[order.workUnitKind] : '—'
  const unitStatus = order.workUnitStatus ? WORK_UNIT_STATUS_LABELS[order.workUnitStatus] : '—'

  function remove() {
    const ok = window.confirm(
      [
        `受注No. ${order.orderNo} を削除します。`,
        `加工区分（${unitLabel}）は「${unitStatus}」のまま変わりません。`,
        '起票をやり直すときは、受注登録待ちの一覧の「受注登録待ちに追加」で区分を足してください。',
        'よろしいですか？',
      ].join('\n')
    )
    if (!ok) return
    setError(null)
    startTransition(async () => {
      const result = await deleteOrder(order.id, order.updatedAt)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.push(orderEditHref({ type: 'delete', notice: 'deleted', no: result.orderNo }))
    })
  }

  return (
    <main className="flex flex-1 flex-col bg-canvas px-8 py-6">
      <p className="text-sm text-neutral-500">処理区分 2 削除。内容を確かめてから削除します（削除の記録は残ります）</p>
      <h1 className="mt-1 text-2xl font-bold text-neutral-900">受注の削除</h1>

      {error && (
        <p role="alert" className="mt-4 rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent">
          {error}
        </p>
      )}

      <section className="mt-5 max-w-2xl rounded border border-line bg-white px-6 py-4">
        <dl className="text-sm">
          <SummaryRow label="受注No.">
            <span className="text-lg font-bold tabular-nums text-navy">{order.orderNo}</span>
          </SummaryRow>
          <SummaryRow label="受付No.">
            {intakeNo}（{unitLabel}。区分の状態: {unitStatus}）
          </SummaryRow>
          <SummaryRow label="売り先">{order.customerName ?? '—'}</SummaryRow>
          <SummaryRow label="工事名">{order.header.projectName ?? '—'}</SummaryRow>
          <SummaryRow label="納期">
            {longDueDateText(order.header.dueDateType as DueDateType, order.header.dueDate, null)}
          </SummaryRow>
          <SummaryRow label="加工場所">{order.siteName ?? '—'}</SummaryRow>
          <SummaryRow label="明細">
            材料 {order.items.length} 行・加工 {processCount} 行
          </SummaryRow>
        </dl>
        <p className="mt-3 text-xs text-neutral-500">
          削除しても、加工区分・受付の状態は自動では戻りません。起票をやり直すときは「受注登録待ちに追加」で区分を足してください。削除した受注No. は使い回しません。
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(orderEditHref({ type: 'delete' }))}
            disabled={pending}
            className="rounded border border-line bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-canvas disabled:opacity-50"
          >
            受注No. の入力に戻る
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="rounded bg-urgent px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? '削除しています…' : 'この受注を削除する'}
          </button>
        </div>
      </section>
    </main>
  )
}
