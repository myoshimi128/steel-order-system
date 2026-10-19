'use client'

// 手動で受付を追加（S-04b。画面イメージ 04b）。受付待ち一覧の上に重ねて出すモーダル。
//   経路（口頭・電話／来社／メール（転送漏れ）／その他）・受付日時（日付＋時刻）・注文書（PDF・DXF。任意・複数）・メモ
//   「追加して受付登録へ」で受付待ちの受付を作り、ファイルを置いてから受付登録の画面へ移る。
// 日付・時刻・メモは Enter で次の欄へ進む（最後はボタン）。Esc か × で閉じる。
// 入力の状態と追加の流れは useManualIntake（lib/intake/use-manual-intake.ts）が持つ。

import { useEffect } from 'react'
import { DateField } from '@/components/code-input/date-field'
import { TextAreaField } from '@/components/code-input/text-area-field'
import { TextField } from '@/components/code-input/text-field'
import { Icon } from '@/components/layout/icon'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { MANUAL_CHANNEL_OPTIONS, useManualIntake } from '@/lib/intake/use-manual-intake'
import { FileDropZone } from './file-drop-zone'

type ManualIntakeDialogProps = {
  today: string
  nowTime: string
  onClose: () => void
}

const SUBMIT_ID = 'manual-intake-submit'
// メモの文字数の上限（電話の内容などを書く。長すぎる文は受付登録の画面で扱いにくいため）
const MEMO_MAX_LENGTH = 500

export function ManualIntakeDialog({ today, nowTime, onClose }: ManualIntakeDialogProps) {
  const form = useManualIntake({ today, nowTime })
  const navigation = useFieldNavigation(['receivedDate', 'receivedTime', 'memo', SUBMIT_ID])

  // 開いたら、受付日の欄にカーソルを置く
  const { focusFirst } = navigation
  useEffect(() => {
    focusFirst()
  }, [focusFirst])

  // Esc で閉じる（追加の途中は閉じない）
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !form.pending) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form.pending, onClose])

  return (
    // 画面全体を薄暗くして、その上にモーダルを出す
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-intake-title"
        onKeyDown={navigation.handleArrowKeys}
        className="flex max-h-[calc(100dvh-32px)] w-[720px] flex-col rounded bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="manual-intake-title" className="text-lg font-bold text-neutral-900">
            手動で受付を追加
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={form.pending}
            className="rounded p-1 text-neutral-400 hover:bg-canvas hover:text-neutral-700"
          >
            <Icon name="x" className="h-5 w-5" />
            <span className="sr-only">閉じる</span>
          </button>
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-6 py-5">
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-neutral-700">
              経路<span className="ml-1 text-urgent">*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {MANUAL_CHANNEL_OPTIONS.map((option) => {
                const selected = form.channel === option.value
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => form.setChannel(option.value)}
                    aria-pressed={selected}
                    className={`flex items-center gap-1.5 rounded border px-4 py-2 text-sm ${
                      selected
                        ? 'border-2 border-navy bg-navy-soft font-semibold text-navy'
                        : 'border-line bg-white text-neutral-700 hover:bg-canvas'
                    }`}
                  >
                    {selected && <Icon name="check" className="h-4 w-4" />}
                    {option.label}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div>
            <p className="mb-2 text-sm font-semibold text-neutral-700">受付日時</p>
            <div className="flex items-start gap-3">
              <DateField
                {...navigation.fieldProps('receivedDate')}
                value={form.date}
                onValueChange={form.setDate}
                today={today}
                error={form.errors.date}
              />
              <TextField
                {...navigation.fieldProps('receivedTime')}
                value={form.time}
                onValueChange={form.setTime}
                error={form.errors.time}
                maxLength={5}
                widthClass="w-24"
              />
              <span className="mt-2 text-xs text-neutral-400">時刻は 4 桁（例: 1040）</span>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-sm font-semibold text-neutral-700">注文書（任意）</p>
              <p className="text-xs text-neutral-400">手書きの注文書をスキャンした PDF など</p>
            </div>
            <FileDropZone
              files={form.files}
              rejected={form.rejected}
              onAdd={form.addFiles}
              onRemove={form.removeFile}
              disabled={form.pending}
            />
          </div>

          <div>
            <label htmlFor="memo" className="mb-2 block text-sm font-semibold text-neutral-700">
              メモ
            </label>
            <TextAreaField
              {...navigation.fieldProps('memo')}
              value={form.memo}
              onValueChange={form.setMemo}
              rows={3}
              maxLength={MEMO_MAX_LENGTH}
              placeholder="例: ○○様より電話。PL 9mm 3 枚、明日中。（改行は Ctrl+Enter）"
            />
          </div>

          <p className="text-xs text-neutral-500">
            「追加」を押すと受付待ちに 1 件追加され、そのまま受付登録（売り先・工事名・納期などの入力）に進みます。
          </p>

          {form.errors.form && (
            <p role="alert" className="rounded border border-urgent/30 bg-urgent/5 px-3 py-2 text-sm text-urgent">
              {form.errors.form}
            </p>
          )}
          {form.partial && (
            <div role="alert" className="rounded border border-attention/40 bg-attention-soft px-3 py-2 text-sm text-attention">
              <p className="font-semibold">受付は追加しましたが、次のファイルを置けませんでした。</p>
              <ul className="mt-1 list-disc pl-5 text-xs">
                {form.partial.failures.map((failure) => (
                  <li key={failure.name}>
                    {failure.name}: {failure.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
          {form.partial ? (
            <button
              type="button"
              onClick={form.continueToRegistration}
              className="flex items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-hover"
            >
              このまま受付登録へ
              <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={form.pending}
                className="rounded border border-line bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                id={SUBMIT_ID}
                ref={navigation.register(SUBMIT_ID)}
                type="button"
                onClick={form.submit}
                disabled={form.pending}
                className="flex items-center gap-2 rounded bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-hover disabled:opacity-60"
              >
                {form.pending ? '追加しています…' : '追加して受付登録へ'}
                <Icon name="arrow-right" className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
