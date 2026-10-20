'use client'

// 受付待ち一覧（S-04a）の状態と操作をまとめたカスタムフック。
//
//   ・選んだ行（右側にメールの中身を出す）。通知から開いたときは、URL の ?selected= の行を選んだ状態で始める
//   ・検索（差出人・件名・メモ・売り先・受付No. で絞り込む。読み込んだ行の中で絞る）
//   ・NEW の印（自分がまだ読んでいない通知のある受付）。行を選ぶと、その受付の通知を既読にして印を消す
//   ・対応中の表示（受付待ちの行を選んでいる間、自分を対応中にする。useIntakeHandling）
//   ・見積・ミルシート／対象外への区分、対象外から受付待ちに戻す
//   ・受付の変更を Realtime で受け取ったら、一覧を読み直す（新着の行・ほかの人の対応中の表示・件数）
// 画面の部品（components/intake/inbox/*）は、このフックの戻り値を表示するだけにする。

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { classifyIntake, type ClassifyStatus } from '@/app/(main)/intake/actions'
import { useNotifications } from '@/components/notifications/notifications-provider'
import { useNow } from '@/lib/hooks/use-now'
import { handlingLabel, handlingStateFor, type HandlingState } from './handling'
import { intakeListHref, type IntakeTab } from './tabs'
import type { IntakeListRow } from './types'
import { useIntakeChanges } from './use-intake-changes'
import { useIntakeHandling } from './use-intake-handling'

type Params = {
  tab: IntakeTab
  rows: IntakeListRow[]
  // URL の ?selected=（通知から開いたときなど）
  initialSelectedId: string | null
  // 自分がまだ読んでいない通知のある受付の id
  unreadIntakeIds: string[]
  userId: string
}

// 検索の対象にする文字（差出人・件名・メモ・売り先・工事名・受付No.）
function searchableText(row: IntakeListRow): string {
  return [row.emailFrom, row.emailSubject, row.memo, row.customerName, row.projectName, row.intakeNo]
    .filter((text): text is string => text !== null)
    .join(' ')
    .toLowerCase()
}

export function useIntakeInbox({ tab, rows, initialSelectedId, unreadIntakeIds, userId }: Params) {
  const router = useRouter()
  const center = useNotifications()
  const now = useNow()

  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId)
  // この画面で既読にした受付（サーバーから新しい未読の一覧が届くまで、NEW の印を消しておく）。
  // 通知から開いた受付は、開いた時点で読んだものとして扱う
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(initialSelectedId ? [initialSelectedId] : [])
  )

  // 通知を押して、この画面のまま別の受付を開いたとき（URL の ?selected= が変わったとき）は、その行を選び直す。
  // 「描画中に、前回の値と比べて state を直す」書き方（React の「props が変わったときに state を合わせる」方法）
  const [previousInitial, setPreviousInitial] = useState(initialSelectedId)
  if (previousInitial !== initialSelectedId) {
    setPreviousInitial(initialSelectedId)
    if (initialSelectedId) {
      setSelectedId(initialSelectedId)
      setReadIds((current) => new Set(current).add(initialSelectedId))
    }
  }

  // 通知から開いた受付の通知を既読にする（画面の外の状態＝サーバーとベルの数だけを変える）
  const markIntakeRead = center?.markIntakeRead
  useEffect(() => {
    if (initialSelectedId && unreadIntakeIds.includes(initialSelectedId)) {
      void markIntakeRead?.(initialSelectedId)
    }
    // 開いた受付が変わったときだけ動かす（未読の一覧が読み直されるたびには動かさない）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSelectedId, markIntakeRead])

  const [query, setQuery] = useState('')
  const keyword = query.trim().toLowerCase()
  const visibleRows = keyword === '' ? rows : rows.filter((row) => searchableText(row).includes(keyword))

  // 選んだ行。一覧が読み直されて行がなくなった（ほかの人が登録した など）ときは、選んでいない状態にする
  const selected = rows.find((row) => row.id === selectedId) ?? null

  // 受付待ちの行を選んでいる間は、自分を対応中にする
  const claim = useIntakeHandling(selected?.status === 'waiting' ? selected.id : null)

  // 受付の変更が届いたら、一覧を読み直す（サーバーの部品を作り直す。選んだ行・検索の文字はそのまま残る）
  useIntakeChanges(true, () => router.refresh())

  const unread = new Set(unreadIntakeIds)
  function isNew(row: IntakeListRow): boolean {
    return unread.has(row.id) && !readIds.has(row.id)
  }

  // ほかの人の対応中か（自分が選んでいる行は、claim_intake の結果を優先する）
  function handlingOf(row: IntakeListRow): { state: HandlingState; label: string } {
    if (claim && claim.intakeId === row.id) {
      const state: HandlingState =
        claim.handlingBy === null ? 'none' : claim.handlingBy === userId ? 'self' : 'other'
      return { state, label: handlingLabel(claim.handlingByName) }
    }
    return { state: handlingStateFor(row, userId, now), label: handlingLabel(row.handlingByName) }
  }

  function select(id: string) {
    setSelectedId(id)
    if (unread.has(id) && !readIds.has(id)) {
      setReadIds((current) => new Set(current).add(id))
      void center?.markIntakeRead(id)
    }
  }

  // 区分の操作（見積・ミルシート／対象外／受付待ちに戻す）
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const CONFIRM_TEXT: Record<ClassifyStatus, string> = {
    estimate: '受付No. を発行して「見積・ミルシート」に区分します。よろしいですか？',
    excluded: '「対象外」に区分します。よろしいですか？（対象外のタブから受付待ちに戻せます）',
    waiting: '受付待ちに戻します。よろしいですか？',
  }

  function classify(status: ClassifyStatus) {
    if (!selected) return
    if (!window.confirm(CONFIRM_TEXT[status])) return
    const target = selected
    setError(null)
    startTransition(async () => {
      const result = await classifyIntake(target.id, status)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setSelectedId(null)
      // 見積・ミルシートは受付No. を発行したので、番号を知らせる
      if (status === 'estimate') {
        router.push(intakeListHref({ tab, notice: 'estimate', no: result.intakeNo }))
      }
    })
  }

  // 受付登録の画面へ。ほかの人が対応中なら、二重に登録しないよう確かめる
  function openRegistration() {
    if (!selected) return
    const handling = handlingOf(selected)
    if (handling.state === 'other' && !window.confirm(`${handling.label}です。続けて受付登録しますか？`)) {
      return
    }
    router.push(`/intake/${selected.id}`)
  }

  return {
    query,
    setQuery,
    visibleRows,
    selected,
    select,
    isNew,
    handlingOf,
    classify,
    openRegistration,
    pending,
    error,
  }
}

export type IntakeInbox = ReturnType<typeof useIntakeInbox>
