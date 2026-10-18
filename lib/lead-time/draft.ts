// 納期連絡の画面で入力中の内容（下書き）と、その確認。
// 入力中は欄の文字をそのまま持ち（日数は「2」のような文字）、公開するときに数値などへ直す。

import type { Congestion } from '@/lib/intake/constants'
import type { LeadTimeBoard, LeadTimeItem, LeadTimeSnapshot } from './types'

// 目安日数の上限（営業日）。DB の関数（publish_lead_times）でも同じ範囲を確かめる
export const MAX_LEAD_TIME_DAYS = 99

// 部署メッセージの長さの上限（ホームのカードに収まるように）
export const MAX_LEAD_TIME_MESSAGE_LENGTH = 200

export type LeadTimeDraftItem = {
  // 画面の行を見分けるための値（React の key）。既存の工程は id、新しく追加した工程は 'new-1' など
  key: string
  // 新しく追加した工程は null
  id: string | null
  name: string
  // 日数の欄の文字（未入力は ''）
  days: string
  congestion: Congestion
  note: string
}

export type LeadTimeDraft = {
  items: LeadTimeDraftItem[]
  message: string
  // 表示期限 'YYYY-MM-DD'（未入力は ''）
  expiresOn: string
}

// 保存済みの目安納期から、入力の初期値を作る（「元に戻す」でもこの値に戻す）
export function boardToDraft(board: LeadTimeBoard): LeadTimeDraft {
  return {
    items: board.items.map((item) => ({
      key: item.id,
      id: item.id,
      name: item.name,
      days: item.days === null ? '' : String(item.days),
      congestion: item.congestion,
      note: item.note ?? '',
    })),
    message: board.message ?? '',
    expiresOn: board.expiresOn ?? '',
  }
}

// 保存済みの目安納期を、要約を作るときの「前」の形にする
export function boardToSnapshot(board: LeadTimeBoard): LeadTimeSnapshot {
  return {
    items: board.items.map(({ id, name, days, congestion, note }) => ({ id, name, days, congestion, note })),
    message: board.message,
    expiresOn: board.expiresOn,
  }
}

// 日数の欄の文字を数値にする。空・数字以外は null
function parseDays(text: string): number | null {
  const value = text.trim()
  if (!/^\d+$/.test(value)) return null
  return Number(value)
}

// 入力中の内容から、プレビュー（ホームでの表示）に出す工程を作る。
// まだ確かめていない入力でも、そのまま見た目に反映する（正しくない日数は「—」）
export function draftToPreviewItems(draft: LeadTimeDraft): LeadTimeItem[] {
  return draft.items.map((item) => ({
    id: item.key,
    name: item.name.trim() || '（名前なし）',
    days: parseDays(item.days),
    congestion: item.congestion,
    note: item.note.trim() || null,
  }))
}

export type DraftValidation =
  | { ok: true; value: LeadTimeSnapshot }
  // errors は行の key ごとのエラー。message はメッセージの欄のエラー
  | { ok: false; errors: Record<string, string>; messageError?: string }

// 公開する前に入力を確かめ、公開する内容に直す
export function validateDraft(draft: LeadTimeDraft): DraftValidation {
  const errors: Record<string, string> = {}
  const seenNames = new Set<string>()

  const items = draft.items.map((item) => {
    const name = item.name.trim()
    const days = parseDays(item.days)

    if (name === '') {
      errors[item.key] = '工程の名前を入れてください'
    } else if (seenNames.has(name)) {
      errors[item.key] = `「${name}」が 2 つあります`
    } else if (item.congestion !== 'consult') {
      // 要相談のときは日数を使わないため、確かめない
      if (item.days.trim() === '') {
        errors[item.key] = '目安日数を入れてください（決められないときは「要相談」）'
      } else if (days === null || days > MAX_LEAD_TIME_DAYS) {
        errors[item.key] = `目安日数は 0〜${MAX_LEAD_TIME_DAYS} の整数で入れてください`
      }
    }
    seenNames.add(name)

    return {
      id: item.id,
      name,
      days: item.congestion === 'consult' ? null : days,
      congestion: item.congestion,
      note: item.note.trim() || null,
    }
  })

  const message = draft.message.trim()
  const messageError =
    message.length > MAX_LEAD_TIME_MESSAGE_LENGTH
      ? `メッセージは ${MAX_LEAD_TIME_MESSAGE_LENGTH} 文字以内にしてください（今 ${message.length} 文字）`
      : undefined

  if (Object.keys(errors).length > 0 || messageError) {
    return { ok: false, errors, messageError }
  }

  return {
    ok: true,
    value: {
      items,
      message: message || null,
      // メッセージを空にしたら、表示期限も空にする（期限だけ残っても意味がないため）
      expiresOn: message && draft.expiresOn ? draft.expiresOn : null,
    },
  }
}
