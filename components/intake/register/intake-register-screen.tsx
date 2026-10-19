'use client'

// 受付登録（S-04c。docs/intake/screen-design.md「S-04c 受付登録」、画面イメージ 04c）。
//   ・左: DocumentViewer（注文書の PDF と図面データ）
//   ・右上の帯: 処理区分・受付No.・受信日時
//   ・右: 受注情報の入力欄（受付登録の列）。下に「保存せず戻る」と登録のボタン
//
// 処理区分で 3 つの使い方をする（docs/intake/basic-design.md「処理区分」）。
//   0 新規: 受付待ちの受付を登録し、受付No. を発行する（/intake/[id]）
//   1 変更: 受付No. を打って呼び出し、受注情報を直す（/intake/register?type=1&no=…）
//   2 削除: 受付No. を打って呼び出し、確かめてから論理削除する（/intake/register?type=2&no=…）
// 処理区分・受付No. を打って Enter を押すと、その URL へ移ってサーバーが受付を読み直す。
//
// 入力の状態は useIntakeForm、欄の移動は useFieldNavigation、対応中の表示は useIntakeHandling が持つ。
// ここでは処理区分の切り替えと、保存の流れ（確認 → Server Action → 一覧へ戻る）だけを扱う。

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { deleteIntake, saveIntake } from '@/app/(main)/intake/actions'
import { CodeField } from '@/components/code-input/code-field'
import { TextField } from '@/components/code-input/text-field'
import { DocumentViewer } from '@/components/intake/document-viewer/document-viewer'
import { HandlingBadge } from '@/components/intake/handling-badge'
import { FormItem } from '@/components/order-entry/header/form-item'
import { Icon } from '@/components/layout/icon'
import { findCodeOption } from '@/lib/code-input/code-option'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { handlingLabel } from '@/lib/intake/handling'
import { initialIntakeFormValues, type IntakeFormDefaults, type IntakeFormMasters } from '@/lib/intake/intake-form'
import { normalizeIntakeNo } from '@/lib/intake/intake-no'
import { formatReceivedAt } from '@/lib/intake/received-at'
import { intakeListHref } from '@/lib/intake/tabs'
import type { IntakeDetail } from '@/lib/intake/types'
import { useIntakeForm } from '@/lib/intake/use-intake-form'
import { useIntakeHandling } from '@/lib/intake/use-intake-handling'
import { PROCESSING_TYPE_OPTIONS } from '@/lib/order-entry/constants'
import { IntakeDeleteSummary } from './intake-delete-summary'
import { IntakeFormFields } from './intake-form-fields'

export type IntakeRegisterMode = 'new' | 'edit' | 'delete'

// 処理区分の番号（0 新規 / 1 変更 / 2 削除）
const MODE_CODES: Record<IntakeRegisterMode, string> = { new: '0', edit: '1', delete: '2' }

type IntakeRegisterScreenProps = {
  mode: IntakeRegisterMode
  // 開いた受付（変更・削除で、まだ受付No. を打っていない・見つからないときは null）
  intake: IntakeDetail | null
  // 受付No. の欄の初期値（URL の ?no=）と、呼び出せなかったときのエラー
  lookupNo: string
  lookupError: string | null
  masters: IntakeFormMasters
  defaults: IntakeFormDefaults
  today: string
  userId: string
  userName: string
}

const SUBMIT_ID = 'submit'

export function IntakeRegisterScreen({
  mode,
  intake,
  lookupNo,
  lookupError,
  masters,
  defaults,
  today,
  userId,
  userName,
}: IntakeRegisterScreenProps) {
  const router = useRouter()
  const form = useIntakeForm(masters, initialIntakeFormValues(intake?.info ?? null, defaults, masters))

  const [processingCode, setProcessingCode] = useState(MODE_CODES[mode])
  const [processingError, setProcessingError] = useState<string | undefined>()
  const [noInput, setNoInput] = useState(lookupNo)
  const [noError, setNoError] = useState<string | undefined>(lookupError ?? undefined)

  // 入力順。処理区分 →（変更・削除は受付No.）→ 受注情報の欄 → ボタン。
  // 削除は入力欄を出さず、呼び出した内容を表示してボタンへ進む
  const showForm = intake !== null && mode !== 'delete'
  const fieldOrder = [
    'processingType',
    ...(mode !== 'new' ? ['intakeNo'] : []),
    ...(showForm ? form.fieldOrder : []),
    ...(intake !== null ? [SUBMIT_ID] : []),
  ]
  const navigation = useFieldNavigation(fieldOrder)

  // 開いたら、新規・変更は売り先の欄に、受付No. を打つ画面は受付No. の欄にカーソルを置く
  const { focusField } = navigation
  useEffect(() => {
    const first = showForm ? 'customerId' : 'intakeNo'
    setTimeout(() => focusField(first), 0)
  }, [focusField, showForm])

  // 新規の受付待ちを開いている間は、自分を対応中にする（ほかの人の画面に「○○さんが対応中」と出る）
  const claim = useIntakeHandling(mode === 'new' && intake ? intake.id : null)
  const otherHandling = claim !== null && claim.handlingBy !== null && claim.handlingBy !== userId

  // 処理区分を打って Enter: 今と違う区分なら、その区分の画面へ移る
  function handleProcessingNext(code: string) {
    const option = findCodeOption(PROCESSING_TYPE_OPTIONS, code)
    if (!option) {
      setProcessingError('処理区分を選択してください')
      return
    }
    setProcessingError(undefined)
    if (code === MODE_CODES[mode]) {
      navigation.focusNext('processingType')
      return
    }
    if (option.value === 'new') {
      // 新規は受付待ち一覧で受付を選んでから始める
      router.push(intakeListHref({}))
      return
    }
    const no = intake?.intakeNo ?? normalizeIntakeNo(noInput)
    router.push(`/intake/register?type=${code}${no ? `&no=${no}` : ''}`)
  }

  // 受付No. を打って Enter: 受付を呼び出す（URL を変えて、サーバーで読み直す）
  function handleIntakeNoNext() {
    const no = normalizeIntakeNo(noInput)
    if (!no) {
      setNoError('受付No. の形が正しくありません（例: 26-1003）')
      return
    }
    if (no === intake?.intakeNo) {
      navigation.focusNext('intakeNo')
      return
    }
    setNoError(undefined)
    router.push(`/intake/register?type=${MODE_CODES[mode]}&no=${no}`)
  }

  const [pending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  function submit() {
    if (!intake) return
    setFormError(null)

    if (mode === 'delete') {
      if (!window.confirm(`受付No. ${intake.intakeNo} を削除します。よろしいですか？`)) return
      startTransition(async () => {
        const result = await deleteIntake(intake.id)
        if (!result.ok) {
          setFormError(result.error)
          return
        }
        const tab = intake.status === 'estimate' ? 'estimate' : 'registered'
        router.push(intakeListHref({ tab, notice: 'deleted', no: intake.intakeNo }))
      })
      return
    }

    const { payload, firstErrorField } = form.validate()
    if (!payload) {
      setFormError('入力に誤りがあります。赤い枠の欄を直してください')
      if (firstErrorField) navigation.focusFieldLater(firstErrorField)
      return
    }
    // ほかの人が対応中なら、二重に登録しないよう確かめる（止めはしない）
    if (otherHandling && !window.confirm(`${handlingLabel(claim.handlingByName)}です。このまま登録しますか？`)) {
      return
    }

    startTransition(async () => {
      const result = await saveIntake(intake.id, payload, mode === 'new')
      if (!result.ok) {
        setFormError(result.error)
        return
      }
      router.push(
        mode === 'new'
          ? intakeListHref({ notice: 'registered', no: result.intakeNo })
          : intakeListHref({ tab: 'registered', notice: 'updated', no: result.intakeNo })
      )
    })
  }

  // 登録すると入る受注登録待ち（加工場所）の名前
  const siteName = findCodeOption(masters.sites, form.values.siteId)?.label ?? null
  const submitLabel =
    mode === 'new' ? '受付No. を発行して登録' : mode === 'edit' ? '変更を保存' : 'この受付を削除'

  return (
    <main className="flex flex-1 flex-col bg-canvas px-5 py-5">
      <Link href={intakeListHref({})} className="flex w-fit items-center gap-1 text-sm text-neutral-600 hover:text-navy">
        <Icon name="arrow-left" className="h-4 w-4" />
        受付待ち一覧に戻る
      </Link>
      <h1 className="mt-1 text-2xl font-bold text-neutral-900">受付登録</h1>

      <div className="mt-4 grid h-[calc(100dvh-var(--header-height)-140px)] min-h-[640px] grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-4">
        {intake ? (
          <DocumentViewer key={intake.id} files={intake.files} />
        ) : (
          <section className="flex items-center justify-center rounded border border-line bg-white p-6 text-sm text-neutral-500">
            受付No. を打って Enter で、受付を呼び出します
          </section>
        )}

        <section
          className="flex min-h-0 flex-col rounded border border-line bg-white"
          // ↑↓ でも欄を移る（受注情報と同じ操作）
          onKeyDown={navigation.handleArrowKeys}
        >
          {/* 上の帯: 処理区分・受付No.・受信日時 */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3 border-b border-line bg-navy-soft/60 px-6 py-4">
            <FormItem label="処理区分" htmlFor="processingType">
              <CodeField
                {...navigation.fieldProps('processingType')}
                onNext={handleProcessingNext}
                listTitle="処理区分"
                options={PROCESSING_TYPE_OPTIONS}
                maxLength={CODE_LENGTHS.processingType}
                code={processingCode}
                onCodeChange={setProcessingCode}
                error={processingError}
                codeWidthClass="w-12"
                nameWidthClass="w-16"
              />
            </FormItem>
            <FormItem label="受付No." htmlFor="intakeNo" note={mode === 'new' ? undefined : '例: 26-1003（- はハイフン）'}>
              {mode === 'new' ? (
                <div className="flex items-center gap-3 py-1.5">
                  <span className="text-lg font-bold tracking-widest text-neutral-300">— — — —</span>
                  <span className="text-xs text-neutral-500">登録すると自動で発行されます</span>
                </div>
              ) : (
                <TextField
                  {...navigation.fieldProps('intakeNo')}
                  onNext={handleIntakeNoNext}
                  value={noInput}
                  onValueChange={(value) => {
                    setNoInput(value)
                    setNoError(undefined)
                  }}
                  error={noError}
                  maxLength={10}
                  widthClass="w-32"
                />
              )}
            </FormItem>
            {intake && (
              <div className="ml-auto flex flex-col items-end gap-2 pt-6">
                <span className="flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-navy">
                  <Icon name="mail" className="h-3.5 w-3.5" />
                  受信 {formatReceivedAt(intake.receivedAt)}
                </span>
                {otherHandling && <HandlingBadge label={handlingLabel(claim.handlingByName)} />}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {showForm && <IntakeFormFields form={form} navigation={navigation} masters={masters} today={today} />}
            {intake && mode === 'delete' && <IntakeDeleteSummary intake={intake} />}
            {!intake && (
              <p className="text-sm text-neutral-500">
                {mode === 'edit' ? '直す受付の' : '削除する受付の'}受付No. を打って Enter を押してください。
              </p>
            )}
          </div>

          {formError && (
            <p role="alert" className="border-t border-urgent/30 bg-urgent/5 px-6 py-2.5 text-sm text-urgent">
              {formError}
            </p>
          )}

          <div className="flex items-center gap-3 border-t border-line px-6 py-4">
            {mode === 'new' && (
              <span className="flex items-center gap-2 text-sm text-neutral-500">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-soft text-xs font-bold text-navy">
                  {userName.slice(0, 1)}
                </span>
                受付登録者：{userName}（自動）
              </span>
            )}
            <div className="ml-auto flex flex-col items-end gap-2">
              <div className="flex gap-3">
                <Link
                  href={intakeListHref({})}
                  className="rounded border border-line bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-canvas"
                >
                  保存せず戻る
                </Link>
                {intake && (
                  <button
                    id={SUBMIT_ID}
                    ref={navigation.register(SUBMIT_ID)}
                    type="button"
                    onClick={submit}
                    disabled={pending}
                    className={`flex items-center gap-2 rounded px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                      mode === 'delete' ? 'bg-urgent hover:bg-urgent/90' : 'bg-navy hover:bg-navy-hover'
                    }`}
                  >
                    {pending ? '保存しています…' : submitLabel}
                    {mode !== 'delete' && <Icon name="arrow-right" className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {mode === 'new' && siteName && (
                <p className="text-xs text-neutral-500">
                  登録すると、振り分けのあと「{siteName}」の受注登録待ちに入ります
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
