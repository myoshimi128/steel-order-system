'use client'

// 「部署からのメッセージ」の区画。メッセージ（文章）と表示期限（日付）を入れる。
// 表示期限の日まではホームに出し、次の日から出さない。期限が空なら出し続ける。

import { DateField } from '@/components/code-input/date-field'
import { Panel } from '@/components/layout/panel'
import { MAX_LEAD_TIME_MESSAGE_LENGTH } from '@/lib/lead-time/draft'
import type { LeadTimeEditorState } from '@/lib/lead-time/use-lead-time-editor'

type LeadTimeMessageFormProps = {
  editor: LeadTimeEditorState
  editable: boolean
  // 今日の日付 'YYYY-MM-DD'（日付の欄で「今年」を決めるのに使う）
  today: string
}

// 日付の欄の Enter で次の欄へ進む操作は、この画面では使わない
function noop() {}

export function LeadTimeMessageForm({ editor, editable, today }: LeadTimeMessageFormProps) {
  const { message, expiresOn } = editor.draft
  const length = message.trim().length

  return (
    <Panel title="部署からのメッセージ">
      <div className="flex flex-col gap-3 p-5">
        <div>
          <textarea
            value={message}
            onChange={(event) => editor.setMessage(event.target.value)}
            disabled={!editable}
            rows={3}
            aria-label="部署からのメッセージ"
            aria-invalid={editor.messageError !== undefined}
            placeholder={editable ? '例：3号機は 10/17 午前に点検で停止します。12mm以上は1日余裕をください。' : ''}
            className={`w-full resize-none rounded border px-3 py-2.5 text-sm outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 disabled:bg-canvas ${
              editor.messageError ? 'border-urgent' : 'border-neutral-300'
            }`}
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-urgent" role={editor.messageError ? 'alert' : undefined}>
              {editor.messageError}
            </span>
            <span className={length > MAX_LEAD_TIME_MESSAGE_LENGTH ? 'text-urgent' : 'text-neutral-400'}>
              {length} / {MAX_LEAD_TIME_MESSAGE_LENGTH}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          {editable ? (
            <DateField
              id="lead-time-expires-on"
              label="表示期限"
              value={expiresOn}
              onValueChange={editor.setExpiresOn}
              today={today}
              onNext={noop}
              onPrevious={noop}
            />
          ) : (
            <p className="text-sm text-neutral-600">
              表示期限：{expiresOn ? expiresOn.replaceAll('-', '/') : 'なし'}
            </p>
          )}
          {editable && (
            <p className="mt-2 text-xs text-neutral-500">
              この日まで表示し、過ぎると自動で非表示になります（空なら出し続けます）。月日 4 桁で入力できます。
            </p>
          )}
        </div>
      </div>
    </Panel>
  )
}
