'use client'

// 納期連絡の画面（S-03。docs/intake/screen-design.md「S-03 納期連絡」、画面イメージ 03）。
//   ・左上: 工程ごとの目安納期（目安日数・混雑度・補足。工程の追加・並べ替え）
//   ・左下: 部署からのメッセージと表示期限
//   ・右: ホームでの表示のプレビュー（入力中の内容がすぐ反映される）と更新履歴
//   ・上部: 「元に戻す」（最後に公開した状態に戻す）と「ホームに公開」（保存 = 公開。下書きはない）
// 編集できるのは事務・管理者だけ。現場のユーザーには同じ画面を閲覧のみで出す。
// 入力の状態と操作は useLeadTimeEditor（lib/lead-time/use-lead-time-editor.ts）にまとめている。

import { Icon } from '@/components/layout/icon'
import { Panel } from '@/components/layout/panel'
import { LeadTimeCard } from '@/components/lead-time/lead-time-card'
import { DEPARTMENT_LABELS } from '@/lib/intake/constants'
import { draftToPreviewItems } from '@/lib/lead-time/draft'
import type { LeadTimeBoard, LeadTimeHistoryEntry } from '@/lib/lead-time/types'
import { useLeadTimeEditor } from '@/lib/lead-time/use-lead-time-editor'
import { LeadTimeDeptTabs } from './lead-time-dept-tabs'
import { LeadTimeHistoryList } from './lead-time-history-list'
import { LeadTimeItemTable } from './lead-time-item-table'
import { LeadTimeMessageForm } from './lead-time-message-form'

type LeadTimeEditorProps = {
  board: LeadTimeBoard
  history: LeadTimeHistoryEntry[]
  // 事務・管理者なら true
  editable: boolean
  // 今日の日付 'YYYY-MM-DD'
  today: string
}

export function LeadTimeEditor({ board, history, editable, today }: LeadTimeEditorProps) {
  const editor = useLeadTimeEditor({ board, latestHistoryId: history[0]?.id ?? null })
  const deptLabel = DEPARTMENT_LABELS[board.dept]

  return (
    <main className="flex-1 bg-canvas px-5 py-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">
            ホーム画面に表示する、{deptLabel}の目安納期とメッセージを設定します
          </p>
          <h1 className="mt-1 flex items-center gap-3 text-2xl font-bold text-neutral-900">
            納期連絡
            {!editable && (
              <span className="rounded border border-line bg-white px-2 py-0.5 text-xs font-semibold text-neutral-500">
                閲覧のみ
              </span>
            )}
          </h1>
        </div>

        {editable && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={editor.reset}
              disabled={!editor.dirty || editor.pending}
              className="rounded border border-line bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
            >
              元に戻す
            </button>
            <button
              type="button"
              onClick={editor.publish}
              disabled={editor.pending}
              className="flex items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="check" className="h-4 w-4" />
              {editor.pending ? '公開中…' : 'ホームに公開'}
            </button>
          </div>
        )}
      </div>

      {/* 公開の結果（エラー・成功）。公開のボタンの近く、画面の上部に出す */}
      {editor.formError && (
        <p
          role="alert"
          className="mt-3 rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent"
        >
          {editor.formError}
        </p>
      )}
      {editor.notice && (
        <p role="status" className="mt-3 rounded border border-navy/20 bg-navy-soft px-4 py-2.5 text-sm text-navy">
          {editor.notice}
        </p>
      )}

      <div className="mt-4">
        <LeadTimeDeptTabs current={board.dept} dirty={editor.dirty} />
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-5">
        <div className="flex min-w-0 flex-col gap-5">
          <LeadTimeItemTable editor={editor} editable={editable} />
          <LeadTimeMessageForm editor={editor} editable={editable} today={today} />
        </div>

        <div className="flex flex-col gap-5">
          <Panel
            title="ホームでの表示"
            aside={<span className="text-xs text-neutral-400">プレビュー</span>}
          >
            <div className="p-3">
              <LeadTimeCard
                dept={board.dept}
                items={draftToPreviewItems(editor.draft)}
                message={editor.draft.message.trim() || null}
                expiresOn={editor.draft.expiresOn || null}
                updatedAt={board.updatedAt}
                updatedByName={board.updatedByName}
                today={today}
              />
            </div>
          </Panel>
          <LeadTimeHistoryList history={history} />
        </div>
      </div>
    </main>
  )
}
