'use client'

// 受付待ち一覧の表（画面イメージ 04a の左側）。
//   上: 検索の欄（差出人・件名などで絞り込む）と「新しい順」
//   列: NEW の印（未読）・受信日時・経路・（受付No.）・差出人・件名・添付
//   下: 手動で受付を追加の案内
// 行を押すと選び、右側にメールの中身を出す。ほかの人が対応中の行には「○○さんが対応中」を出す。
// 受付登録済・見積・ミルシートのタブでは、受付No. の列を足し、差出人・件名の代わりに売り先・工事名を出す。

import { Icon } from '@/components/layout/icon'
import { AttachmentBadges } from '@/components/intake/attachment-badges'
import { ChannelLabel } from '@/components/intake/channel-label'
import { HandlingBadge } from '@/components/intake/handling-badge'
import type { IntakeInbox } from '@/lib/intake/use-intake-inbox'
import { formatReceivedAt } from '@/lib/intake/received-at'
import type { IntakeTab } from '@/lib/intake/tabs'
import type { IntakeListRow } from '@/lib/intake/types'

type IntakeListProps = {
  tab: IntakeTab
  inbox: IntakeInbox
  // 読み込んだ件数（検索で絞る前）
  totalCount: number
}

// 差出人の欄に出す文字（登録済みなら売り先、メールなら差出人、なければ経路に応じた文）
function senderText(row: IntakeListRow): string {
  return row.customerName ?? row.emailFrom ?? (row.channel === 'fax' ? 'FAX 受信' : '（差出人なし）')
}

// 件名の欄に出す文字（登録済みなら工事名、メールなら件名、なければメモ）
function subjectText(row: IntakeListRow): string {
  return row.projectName ?? row.emailSubject ?? row.memo ?? ''
}

export function IntakeList({ tab, inbox, totalCount }: IntakeListProps) {
  const showIntakeNo = tab === 'registered' || tab === 'estimate'
  const rows = inbox.visibleRows

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <label className="relative w-80">
          <span className="sr-only">差出人・件名で検索</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            value={inbox.query}
            onChange={(event) => inbox.setQuery(event.target.value)}
            placeholder="差出人・件名で検索"
            className="w-full rounded border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-navy"
          />
        </label>
        <span className="text-xs text-neutral-500">新しい順</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full table-fixed text-sm">
          <thead className="sticky top-0 bg-canvas text-left text-xs text-neutral-500">
            <tr>
              <th className="w-14 px-3 py-2 font-semibold">
                <span className="sr-only">未読</span>
              </th>
              <th className="w-24 px-2 py-2 font-semibold">受信日時</th>
              <th className="w-24 px-2 py-2 font-semibold">経路</th>
              {showIntakeNo && <th className="w-20 px-2 py-2 font-semibold">受付No.</th>}
              <th className="w-44 px-2 py-2 font-semibold">{showIntakeNo ? '売り先' : '差出人'}</th>
              <th className="px-2 py-2 font-semibold">{showIntakeNo ? '工事名' : '件名'}</th>
              <th className="w-36 px-2 py-2 font-semibold">添付</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = inbox.selected?.id === row.id
              const isNew = inbox.isNew(row)
              const handling = inbox.handlingOf(row)
              return (
                <tr
                  key={row.id}
                  onClick={() => inbox.select(row.id)}
                  aria-selected={selected}
                  className={`cursor-pointer border-b border-line ${
                    selected ? 'bg-navy-soft' : 'hover:bg-canvas'
                  }`}
                >
                  <td className="px-3 py-3">
                    {isNew && (
                      <span className="rounded bg-navy px-1.5 py-0.5 text-[10px] font-bold text-white">NEW</span>
                    )}
                  </td>
                  <td className={`px-2 py-3 tabular-nums ${isNew ? 'font-bold' : ''}`}>
                    {formatReceivedAt(row.receivedAt)}
                  </td>
                  <td className="px-2 py-3">
                    <ChannelLabel channel={row.channel} />
                  </td>
                  {showIntakeNo && <td className="px-2 py-3 font-semibold tabular-nums">{row.intakeNo}</td>}
                  <td className="px-2 py-3">
                    <span className={`block truncate ${isNew ? 'font-bold' : ''}`} title={senderText(row)}>
                      {row.isUrgent && <span className="mr-1 font-bold text-urgent">至急</span>}
                      {senderText(row)}
                    </span>
                    {handling.state === 'other' && (
                      <span className="mt-1 block">
                        <HandlingBadge label={handling.label} />
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    <span className="block truncate" title={subjectText(row)}>
                      {subjectText(row)}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <AttachmentBadges files={row.files} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-neutral-500">
            {totalCount === 0 ? 'このタブの受付はありません' : '検索に当てはまる受付はありません'}
          </p>
        )}
      </div>

      <p className="flex items-center gap-2 border-t border-line px-4 py-3 text-xs text-neutral-500">
        <Icon name="plus" className="h-3.5 w-3.5" />
        電話注文など、メール・FAX 以外の受付は「手動で受付を追加」から登録できます
      </p>
    </div>
  )
}
