'use client'

// 受注登録待ちに追加（S-06b。docs/intake/screen-design.md「S-06b」、画面イメージ 06b）。受注登録待ち一覧の上に重ねるモーダル。
// 振り分けの見落とし・口頭での追加注文などの例外を、振り分け完了後の受付に区分として足す。
//   ・受付No.（Enter か「呼び出す」で、売り先・工事名・納期と、その受付の今の区分を出す）
//   ・追加の理由（振り分けの見落とし／口頭での追加注文／その他）・区分（先寸／アイトレ（CAD へ））
//   ・メモ（「その他」のときは必須）・図面と注文書（PDF・DXF。任意・複数）
// Esc か × で閉じる。入力の状態と追加の流れは useAddWorkUnit（lib/intake/use-add-work-unit.ts）が持つ。

import Link from 'next/link'
import { useEffect, useRef, type ReactNode } from 'react'
import { FileDropZone } from '@/components/intake/manual/file-drop-zone'
import { Icon } from '@/components/layout/icon'
import {
  ADD_KIND_OPTIONS,
  ADD_NOTE_MAX_LENGTH,
  ADD_ORIGIN_OPTIONS,
  addableIntakeError,
} from '@/lib/intake/add-work-unit-form'
import { longDueDateText } from '@/lib/intake/cad'
import { WORK_UNIT_KIND_LABELS, WORK_UNIT_ORIGIN_LABELS, WORK_UNIT_STATUS_LABELS } from '@/lib/intake/constants'
import { useAddWorkUnit } from '@/lib/intake/use-add-work-unit'

type AddWorkUnitDialogProps = {
  // 一覧のタブの営業所のコード（追加の後に戻るタブ）
  siteCode: string | null
  onClose: () => void
}

// 選択肢のボタン（選んだものは ✓ と太い枠）
function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center gap-1.5 rounded border px-4 py-2 text-sm ${
        selected
          ? 'border-2 border-navy bg-navy-soft font-semibold text-navy'
          : 'border-line bg-white text-neutral-700 hover:bg-canvas'
      }`}
    >
      {selected && <Icon name="check" className="h-4 w-4" />}
      {children}
    </button>
  )
}

function FieldTitle({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return (
    <p className="mb-2 text-sm font-semibold text-neutral-700">
      {children}
      {required && <span className="ml-1 text-urgent">*</span>}
    </p>
  )
}

function ErrorText({ text }: { text: string | undefined }) {
  return text ? (
    <p role="alert" className="mt-1 text-xs text-urgent">
      {text}
    </p>
  ) : null
}

export function AddWorkUnitDialog({ siteCode, onClose }: AddWorkUnitDialogProps) {
  const form = useAddWorkUnit({ siteCode, onDone: onClose })
  const intakeNoRef = useRef<HTMLInputElement>(null)

  // 開いたら、受付No. の欄にカーソルを置く
  useEffect(() => {
    intakeNoRef.current?.focus()
  }, [])

  // Esc で閉じる（追加の途中は閉じない）
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !form.pending) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [form.pending, onClose])

  const intake = form.intake
  const intakeProblem = intake ? addableIntakeError(intake.status) : null

  return (
    // 画面全体を薄暗くして、その上にモーダルを出す
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-work-unit-title"
        className="flex max-h-[calc(100dvh-32px)] w-[720px] flex-col rounded bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 id="add-work-unit-title" className="text-lg font-bold text-neutral-900">
            受注登録待ちに追加
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
          <div>
            <FieldTitle required>受付No.</FieldTitle>
            <div className="flex items-center gap-2">
              <input
                ref={intakeNoRef}
                value={form.intakeNoInput}
                onChange={(event) => form.setIntakeNoInput(event.target.value)}
                onKeyDown={(event) => {
                  // 日本語入力の変換を確定する Enter では呼び出さない
                  if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    form.lookup()
                  }
                }}
                placeholder="26-1003"
                maxLength={12}
                className={`w-44 rounded border px-3 py-2 text-lg tabular-nums outline-none focus:border-navy ${
                  form.errors.intakeNo ? 'border-urgent' : 'border-line'
                }`}
              />
              <button
                type="button"
                onClick={form.lookup}
                disabled={form.looking || form.intakeNoInput.trim() === ''}
                className="rounded border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-canvas disabled:opacity-50"
              >
                {form.looking ? '呼び出しています…' : '呼び出す'}
              </button>
              {intake && !intakeProblem && <Icon name="check" className="h-5 w-5 text-navy" />}
            </div>
            {/* 呼び出した受付に追加できないとき（振り分け前など）は、呼び出した時点で理由を出す */}
            <ErrorText text={intakeProblem ?? form.errors.intakeNo} />
            {intake?.status === 'registered' && (
              <Link href={`/intake/${intake.id}/split`} className="mt-1 inline-block text-xs text-navy underline">
                振り分けの画面を開く
              </Link>
            )}

            {intake && (
              <dl className="mt-3 grid grid-cols-[72px_1fr] gap-x-3 gap-y-1 rounded bg-canvas px-4 py-3 text-sm">
                <dt className="text-neutral-500">売り先</dt>
                <dd className="font-semibold">{intake.customerName ?? '—'}</dd>
                <dt className="text-neutral-500">工事名</dt>
                <dd>{intake.projectName ?? '—'}</dd>
                <dt className="text-neutral-500">納期</dt>
                <dd>{longDueDateText(intake.dueDateType, intake.dueDate, intake.deliveryMethodName)}</dd>
                <dt className="text-neutral-500">今の区分</dt>
                <dd>
                  {intake.units.length === 0
                    ? 'なし'
                    : intake.units
                        .map((unit) => {
                          const origin = WORK_UNIT_ORIGIN_LABELS[unit.origin]
                          return `${WORK_UNIT_KIND_LABELS[unit.kind]}${origin ? `（${origin}）` : ''}: ${WORK_UNIT_STATUS_LABELS[unit.status]}`
                        })
                        .join('、')}
                </dd>
              </dl>
            )}
          </div>

          <div>
            <FieldTitle required>追加の理由</FieldTitle>
            <div className="flex flex-wrap gap-2">
              {ADD_ORIGIN_OPTIONS.map((option) => (
                <ChoiceButton
                  key={option.value}
                  selected={form.origin === option.value}
                  onClick={() => form.setOrigin(option.value)}
                >
                  {option.label}
                </ChoiceButton>
              ))}
            </div>
            <ErrorText text={form.errors.origin} />
          </div>

          <div>
            <FieldTitle required>区分</FieldTitle>
            <div className="flex flex-wrap gap-2">
              {ADD_KIND_OPTIONS.map((option) => (
                <ChoiceButton key={option.value} selected={form.kind === option.value} onClick={() => form.setKind(option.value)}>
                  {option.label}
                </ChoiceButton>
              ))}
            </div>
            <ErrorText text={form.errors.kind} />
          </div>

          <div>
            <label htmlFor="add-work-unit-note" className="mb-2 block text-sm font-semibold text-neutral-700">
              メモ
              {form.origin === 'other' && <span className="ml-1 text-urgent">*</span>}
            </label>
            <input
              id="add-work-unit-note"
              value={form.note}
              onChange={(event) => form.setNote(event.target.value)}
              maxLength={ADD_NOTE_MAX_LENGTH}
              placeholder="例: リブ PL の図面を振り分けで見落とし"
              className={`w-full rounded border px-3 py-2 text-sm outline-none focus:border-navy ${
                form.errors.note ? 'border-urgent' : 'border-line'
              }`}
            />
            <ErrorText text={form.errors.note} />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-sm font-semibold text-neutral-700">図面・注文書（任意）</p>
              <p className="text-xs text-neutral-400">見落とした図面だけを PDF・DXF にしたものなど</p>
            </div>
            <FileDropZone
              files={form.files}
              rejected={form.rejected}
              onAdd={form.addFiles}
              onRemove={form.removeFile}
              disabled={form.pending}
            />
          </div>

          <p className="text-xs text-neutral-500">
            {form.kind === 'aitore'
              ? '追加すると、CAD の作業待ちに入ります。CAD で CSV が登録されると、受注登録待ちに並びます。'
              : '追加すると、この受付No. の受注登録待ちに、選んだ理由の印を付けて並びます。'}
          </p>

          {form.errors.form && (
            <p role="alert" className="whitespace-pre-line rounded border border-urgent/30 bg-urgent/5 px-3 py-2 text-sm text-urgent">
              {form.errors.form}
            </p>
          )}
          {form.partial && (
            <div role="alert" className="rounded border border-attention/40 bg-attention-soft px-3 py-2 text-sm text-attention">
              <p className="font-semibold">区分は追加しましたが、次のファイルを置けませんでした。</p>
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
              onClick={form.finishPartial}
              className="rounded bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-hover"
            >
              閉じる
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
                type="button"
                onClick={form.submit}
                disabled={form.pending || form.looking}
                className="rounded bg-navy px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-hover disabled:opacity-60"
              >
                {form.pending ? '追加しています…' : '追加する'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
