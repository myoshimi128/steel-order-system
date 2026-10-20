'use client'

// 振り分け（S-04d。docs/intake/screen-design.md「S-04d 振り分け」、画面イメージ 04d）。
//   ・上: 受付No.・売り先・工事名・納期と「注文書を開く」
//   ・左: 元データの一覧（OriginalFilePanel）
//   ・右: 先寸とアイトレの 2 つの枠（SplitSlot）と、下に未振り分けの数・「一覧に戻る」・「振り分け完了」
//     2 つの枠がどちらも空なら、「振り分け完了」の代わりに「図面なしで 先寸／アイトレ として登録」を出す
// 枠は入れた時点で保存するため、「一時保存」のボタンは置かない（画面を離れても、枠の中身は残る）。
// 状態と操作は useSplitBoard（lib/intake/use-split-board.ts）が持つ。

import Link from 'next/link'
import { Icon } from '@/components/layout/icon'
import { Panel } from '@/components/layout/panel'
import { SPLIT_SLOTS } from '@/lib/intake/split'
import { intakeListHref } from '@/lib/intake/tabs'
import type { IntakeDetail } from '@/lib/intake/types'
import { useSplitBoard } from '@/lib/intake/use-split-board'
import { OriginalFilePanel } from './original-file-panel'
import { SplitSlot } from './split-slot'

type SplitScreenProps = {
  intake: IntakeDetail
  // 受付登録のすぐ後に開いたときのお知らせ（なければ null）
  notice: string | null
}

// 見出しの納期（確定・仮納期は日付「10/03」、それ以外は種別）
function dueDateText(intake: IntakeDetail): string | null {
  if (!intake.dueDateType) return null
  return intake.dueDate ? `納期 ${intake.dueDate.slice(5).replace('-', '/')}` : `納期 ${intake.dueDateType}`
}

const SECONDARY_BUTTON =
  'rounded border border-line bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50'
const PRIMARY_BUTTON =
  'flex items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-60'

export function SplitScreen({ intake, notice }: SplitScreenProps) {
  const board = useSplitBoard(intake)
  const dueDate = dueDateText(intake)
  const totalOriginals = board.originals.length

  return (
    <main className="flex flex-1 flex-col bg-canvas px-5 py-5">
      <Link
        href={intakeListHref({ tab: 'registered' })}
        className="flex w-fit items-center gap-1 text-sm text-neutral-600 hover:text-navy"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        受付登録済の一覧に戻る
      </Link>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <h1 className="text-2xl font-bold text-neutral-900">振り分け</h1>
        <span className="text-lg tabular-nums text-neutral-700">{intake.intakeNo}</span>
        {intake.isUrgent && <span className="font-bold text-urgent">至急</span>}
        <span className="text-lg text-neutral-700">{intake.customerName}</span>
        {intake.projectName && <span className="text-lg text-neutral-700">{intake.projectName}</span>}
        {dueDate && <span className="text-lg text-neutral-700">{dueDate}</span>}
        {board.orderPdfs.map((file) =>
          file.viewUrl ? (
            <a
              key={file.id}
              href={file.viewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 self-center rounded border border-line bg-white px-2 py-1 text-xs hover:bg-canvas"
              title={file.originalName}
            >
              <Icon name="external" className="h-3.5 w-3.5" />
              注文書を開く
            </a>
          ) : null
        )}
      </div>

      {notice && (
        <p role="status" className="mt-3 rounded border border-navy/20 bg-navy-soft px-4 py-2.5 text-sm font-semibold text-navy">
          {notice}。続けて振り分けます
        </p>
      )}

      <div className="mt-4 grid h-[calc(100dvh-var(--header-height)-150px)] min-h-[600px] grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-4">
        <OriginalFilePanel board={board} />

        <Panel title="振り分け" aside={<span className="text-xs text-neutral-500">枠にドロップ（複数可）・入れた時点で保存</span>} className="min-h-0">
          <div className="grid min-h-0 flex-1 grid-cols-2 gap-4 p-4">
            {SPLIT_SLOTS.map((slot) => (
              <SplitSlot key={slot} slot={slot} board={board} />
            ))}
          </div>

          {board.error && (
            <p role="alert" className="whitespace-pre-line border-t border-urgent/30 bg-urgent/5 px-5 py-2.5 text-sm text-urgent">
              {board.error}
            </p>
          )}

          <div className="flex items-center gap-3 border-t border-line px-5 py-4">
            <p className={`text-sm ${board.unassigned > 0 ? 'font-semibold text-urgent' : 'text-neutral-500'}`}>
              {board.unassigned > 0
                ? `未振り分けの元データが ${board.unassigned} 件あります`
                : totalOriginals > 0
                  ? `元データ ${totalOriginals} 件はすべて振り分け済みです`
                  : '元データはありません'}
            </p>
            <div className="ml-auto flex gap-3">
              <Link href={intakeListHref({ tab: 'registered' })} className={SECONDARY_BUTTON}>
                一覧に戻る
              </Link>
              {board.withoutDrawingsAllowed ? (
                // 図面が 1 つもない注文（FAX・口頭など）は、区分を選んで図面なしで登録する
                SPLIT_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => board.complete(slot)}
                    disabled={board.busy}
                    className={PRIMARY_BUTTON}
                  >
                    図面なしで{slot === 'sakisun' ? '先寸' : 'アイトレ'}として登録
                  </button>
                ))
              ) : (
                <button type="button" onClick={() => board.complete(null)} disabled={board.busy} className={PRIMARY_BUTTON}>
                  {board.completing ? '完了しています…' : '振り分け完了'}
                  <Icon name="arrow-right" className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </Panel>
      </div>
    </main>
  )
}
