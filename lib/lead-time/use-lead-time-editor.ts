'use client'

// 納期連絡の画面（S-03）の入力の状態と操作をまとめたカスタムフック。
// 表示のコンポーネント（components/lead-time-editor/）とは切り離し、ここでは状態の更新だけを扱う。
//
//   ・入力中の内容（下書き）は画面の中だけに持ち、「ホームに公開」で初めて DB に書く（下書きの保存はない）
//   ・「元に戻す」で、最後に公開した状態（画面を開いたときの内容）に戻す
//   ・公開に成功すると、サーバーから新しい内容が届く（Server Action の revalidatePath）。
//     最新の更新履歴が変わったのを見て、入力を新しい内容で作り直す

import { useMemo, useRef, useState, useTransition } from 'react'
import { publishLeadTimes } from '@/app/(main)/shearing/lead-time/actions'
import type { Congestion } from '@/lib/intake/constants'
import { formatShortDateTime } from './display'
import {
  boardToDraft,
  boardToSnapshot,
  validateDraft,
  type LeadTimeDraft,
  type LeadTimeDraftItem,
} from './draft'
import { buildLeadTimeSummary } from './summary'
import type { LeadTimeBoard } from './types'

type Params = {
  board: LeadTimeBoard
  // 画面を開いた時点（または最後に公開した時点）の最新の更新履歴の id。履歴がなければ null
  latestHistoryId: string | null
}

// 日数の欄に打てるのは数字だけ（全角の数字は半角にする）。2 桁まで
function sanitizeDays(text: string): string {
  return text.normalize('NFKC').replace(/[^0-9]/g, '').slice(0, 2)
}

export function useLeadTimeEditor({ board, latestHistoryId }: Params) {
  // 最後に公開した状態の入力（「元に戻す」と、変更があるかの判定に使う）
  const published = useMemo(() => boardToDraft(board), [board])
  const [draft, setDraft] = useState<LeadTimeDraft>(published)
  // 行の key ごとのエラー・メッセージの欄のエラー・画面全体のエラー
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({})
  const [messageError, setMessageError] = useState<string | undefined>(undefined)
  const [formError, setFormError] = useState<string | undefined>(undefined)
  // 公開できたときの知らせ（「ホームに公開しました（10/19 09:12）」）
  const [notice, setNotice] = useState<string | undefined>(undefined)
  // useTransition は、公開の処理中かどうか（pending）を返す。処理中はボタンを押せなくする
  const [pending, startTransition] = useTransition()
  // 新しく追加した工程の行の key（'new-1'、'new-2' …）に使う番号
  const nextNewKey = useRef(1)

  // 最新の更新履歴が変わったら（自分が公開した後に新しい内容が届いたら）、入力を新しい内容で作り直す。
  // 描画中に前回の値と比べて state を直すのは、React の「props が変わったときに state を合わせる」書き方
  const [seenHistoryId, setSeenHistoryId] = useState(latestHistoryId)
  if (seenHistoryId !== latestHistoryId) {
    setSeenHistoryId(latestHistoryId)
    setDraft(published)
    setItemErrors({})
    setMessageError(undefined)
  }

  // 公開した状態から変わっているか（文字の並びで比べる）
  const dirty = JSON.stringify(draft) !== JSON.stringify(published)

  // 入力を変えたら、知らせとエラーの表示を消す（古い結果を出したままにしない）
  function clearMessages() {
    setNotice(undefined)
    setFormError(undefined)
  }

  // 1 つの行だけを書き換える
  function updateItem(key: string, change: Partial<LeadTimeDraftItem>) {
    clearMessages()
    setDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...change } : item)),
    }))
    // その行のエラーは、直し始めたら消す
    setItemErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function setItemDays(key: string, text: string) {
    updateItem(key, { days: sanitizeDays(text) })
  }

  function setItemCongestion(key: string, congestion: Congestion) {
    updateItem(key, { congestion })
  }

  function setItemNote(key: string, note: string) {
    updateItem(key, { note })
  }

  // 新しく追加した工程の名前（既存の工程の名前は変えない）
  function setItemName(key: string, name: string) {
    updateItem(key, { name })
  }

  // 工程を末尾に追加する（名前は追加した行で入れる）
  function addItem(): string {
    clearMessages()
    const key = `new-${nextNewKey.current++}`
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        { key, id: null, name: '', days: '', congestion: 'normal', note: '' },
      ],
    }))
    return key
  }

  // 新しく追加した、まだ公開していない工程だけ消せる（工程の削除はできない）
  function removeNewItem(key: string) {
    clearMessages()
    setDraft((current) => ({
      ...current,
      items: current.items.filter((item) => !(item.key === key && item.id === null)),
    }))
  }

  // 工程を 1 つ上（-1）・下（+1）へ動かす
  function moveItem(key: string, direction: -1 | 1) {
    clearMessages()
    setDraft((current) => {
      const index = current.items.findIndex((item) => item.key === key)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.items.length) return current
      const items = [...current.items]
      // 2 つの行を入れ替える
      ;[items[index], items[target]] = [items[target], items[index]]
      return { ...current, items }
    })
  }

  function setMessage(message: string) {
    clearMessages()
    setMessageError(undefined)
    setDraft((current) => ({ ...current, message }))
  }

  function setExpiresOn(expiresOn: string) {
    clearMessages()
    setDraft((current) => ({ ...current, expiresOn }))
  }

  // 「元に戻す」: 最後に公開した状態に戻す
  function reset() {
    setDraft(published)
    setItemErrors({})
    setMessageError(undefined)
    clearMessages()
  }

  // 「ホームに公開」
  function publish() {
    clearMessages()
    const result = validateDraft(draft)
    if (!result.ok) {
      setItemErrors(result.errors)
      setMessageError(result.messageError)
      setFormError('入力を確かめてください')
      return
    }

    const summary = buildLeadTimeSummary(boardToSnapshot(board), result.value)
    if (summary === null) {
      setFormError('変更がありません')
      return
    }

    startTransition(async () => {
      const response = await publishLeadTimes({
        dept: board.dept,
        snapshot: result.value,
        summary,
        expectedHistoryId: latestHistoryId,
      })
      if (!response.ok) {
        setFormError(response.error)
        return
      }
      setNotice(`ホームに公開しました（${formatShortDateTime(new Date().toISOString())}）`)
    })
  }

  return {
    draft,
    dirty,
    pending,
    itemErrors,
    messageError,
    formError,
    notice,
    setItemDays,
    setItemCongestion,
    setItemNote,
    setItemName,
    addItem,
    removeNewItem,
    moveItem,
    setMessage,
    setExpiresOn,
    reset,
    publish,
  }
}

export type LeadTimeEditorState = ReturnType<typeof useLeadTimeEditor>
