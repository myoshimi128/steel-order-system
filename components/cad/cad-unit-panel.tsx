'use client'

// CAD の右のパネル（画面イメージ 05 の右側）。一覧で選んだアイトレ 1 件の中身と操作。
//   ・上: 状態・アイトレ・先寸あり・至急の印、受付No.・売り先、工事名・納期・加工場所・担当
//     作業待ちなら「作業開始」、作業中なら「作業開始を取り消す」
//     長く作業中のままなら、CSV の入れ忘れを確かめる案内（オレンジ）
//   ・図面データ: この加工区分の DXF の一覧（「開く」「すべて図面ソフトで開く」）
//   ・注文書: 受付の注文書の PDF（新しいタブで開く）
//   ・部品作成後の CSV: ドロップの枠と、登録した CSV（「開く」と × で外す）。作業待ちの間は枠を出さない
//   ・下: ネスティング後のデータと用紙の案内

import type { ReactNode } from 'react'
import { Icon } from '@/components/layout/icon'
import { IntakeFileList } from '@/components/intake/intake-file-list'
import { formatShortDateTime } from '@/lib/lead-time/display'
import { cadStatusLabel, longDueDateText } from '@/lib/intake/cad'
import { isPdf } from '@/lib/intake/attachments'
import type { CadUnit } from '@/lib/intake/types'
import type { CadBoard } from '@/lib/intake/use-cad-board'
import { CadCsvFiles } from './cad-csv-files'
import { CadCsvDropZone } from './cad-csv-drop-zone'

type CadUnitPanelProps = {
  unit: CadUnit
  board: CadBoard
}

// 見出しの小さな印
function Tag({ children, tone }: { children: string; tone: 'navy' | 'outline' | 'urgent' }) {
  const style = {
    navy: 'bg-navy text-white',
    outline: 'border border-navy text-navy',
    urgent: 'bg-urgent text-white',
  }[tone]
  return <span className={`rounded px-2 py-0.5 text-xs font-bold ${style}`}>{children}</span>
}

// 情報の 1 行（左に項目名、右に値）
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-neutral-500">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  )
}

export function CadUnitPanel({ unit, board }: CadUnitPanelProps) {
  const elapsed = board.elapsedOf(unit)
  const busy = board.busyUnitId === unit.id
  const drawingCount = unit.drawings.filter((file) => !isPdf(file.originalName)).length

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* 受付の情報と作業の操作 */}
        <div className="border-b border-line px-5 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-bold text-navy">{cadStatusLabel(unit.status)}</span>
            <Tag tone="navy">アイトレ</Tag>
            {unit.hasSakisun && <Tag tone="outline">先寸あり</Tag>}
            {unit.isUrgent && <Tag tone="urgent">至急</Tag>}
          </div>
          <p className="mt-2 flex flex-wrap items-baseline gap-x-3 text-lg font-bold text-neutral-900">
            <span className="tabular-nums">{unit.intakeNo}</span>
            <span>{unit.customerName}</span>
          </p>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
            <InfoRow label="工事名">{unit.projectName ?? '—'}</InfoRow>
            <InfoRow label="納期">{longDueDateText(unit.dueDateType, unit.dueDate, unit.deliveryMethodName)}</InfoRow>
            <InfoRow label="加工場所">{unit.siteName ?? '—'}</InfoRow>
            <InfoRow label="担当">
              {unit.assigneeName ? (
                <>
                  {unit.assigneeName}
                  {unit.startedAt && (
                    <span className="text-neutral-500">（{formatShortDateTime(unit.startedAt)} 開始）</span>
                  )}
                  {elapsed && (
                    <span className={`ml-1 ${elapsed.long ? 'font-bold text-attention' : 'text-neutral-500'}`}>
                      {elapsed.text}経過
                    </span>
                  )}
                </>
              ) : (
                '—'
              )}
            </InfoRow>
          </dl>

          {elapsed?.long && (
            <p className="mt-3 rounded border border-attention/40 bg-attention-soft px-3 py-2 text-xs text-attention">
              作業開始から {elapsed.text}たっています。CAD の作業が終わっていれば、CSV を入れてください
            </p>
          )}

          {unit.status === 'cad_waiting' && (
            <button
              type="button"
              onClick={() => void board.start(unit)}
              disabled={busy}
              className="mt-4 w-full rounded bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-hover disabled:opacity-60"
            >
              {busy ? '記録しています…' : '作業開始'}
            </button>
          )}
          {unit.status === 'cad_working' && (
            <button
              type="button"
              onClick={() => void board.cancel(unit)}
              disabled={busy}
              className="mt-3 text-xs text-neutral-500 underline hover:text-neutral-800 disabled:opacity-50"
            >
              作業開始を取り消す（作業待ちに戻す）
            </button>
          )}
        </div>

        {/* 図面データと注文書 */}
        <div className="border-b border-line px-5 py-4">
          <h3 className="mb-2 text-sm font-bold text-neutral-800">図面データ（DXF {drawingCount}件）</h3>
          <IntakeFileList
            files={unit.drawings}
            emptyText="この区分の図面はありません（図面なしで登録された注文）"
            showOpenAll={drawingCount >= 2}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {unit.orderPdfs.length === 0 && <span className="text-xs text-neutral-500">注文書の PDF はありません</span>}
            {unit.orderPdfs.map((file) =>
              file.viewUrl ? (
                <a
                  key={file.id}
                  href={file.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  title={file.originalName}
                  className="flex items-center gap-1 rounded border border-line px-3 py-1.5 text-xs font-semibold hover:bg-canvas"
                >
                  <Icon name="external" className="h-3.5 w-3.5" />
                  {unit.orderPdfs.length > 1 ? file.originalName : '注文書 PDF'}
                </a>
              ) : (
                <span key={file.id} className="text-xs text-neutral-500">
                  {file.originalName}（表示できません）
                </span>
              )
            )}
          </div>
        </div>

        {/* 部品作成後の CSV */}
        <div className="px-5 py-4">
          <h3 className="mb-2 text-sm font-bold text-neutral-800">部品作成後の CSV</h3>
          {unit.status === 'cad_waiting' ? (
            <p className="rounded border border-dashed border-line px-3 py-4 text-center text-xs text-neutral-500">
              「作業開始」を押してから、CAD で部品を作成して CSV を入れます
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <CadCsvFiles unit={unit} board={board} />
              <CadCsvDropZone unit={unit} board={board} />
            </div>
          )}
        </div>
      </div>

      <p className="border-t border-line px-5 py-3 text-xs text-neutral-500">
        ネスティング後のデータと用紙は、今まで通り現場に渡します
      </p>
    </div>
  )
}
