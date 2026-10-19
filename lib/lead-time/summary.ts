// 納期連絡を公開するとき、更新履歴（lead_time_history.summary）に残す要約を作る。
// 例:「レーザー 3→2営業日、プラズマを「やや混雑」に変更、メッセージを更新」
// docs/intake/screen-design.md「S-03 納期連絡」

import { CONGESTION_LABELS } from '@/lib/intake/constants'
import type { LeadTimeSnapshot } from './types'

type SnapshotItem = LeadTimeSnapshot['items'][number]

// 日数の表し方（要相談・未入力は「—」）
function daysText(item: SnapshotItem): string {
  if (item.congestion === 'consult' || item.days === null) return '—'
  return String(item.days)
}

// 公開前（before）と公開する内容（after）を比べて、変わったところを「、」でつないで返す。
// 何も変わっていなければ null を返す（画面では「変更がありません」として公開させない）
export function buildLeadTimeSummary(before: LeadTimeSnapshot, after: LeadTimeSnapshot): string | null {
  const parts: string[] = []
  const beforeById = new Map(before.items.map((item) => [item.id, item]))

  for (const item of after.items) {
    const previous = item.id === null ? undefined : beforeById.get(item.id)

    if (!previous) {
      // 新しく追加した工程
      parts.push(`工程「${item.name}」を追加`)
      continue
    }

    // 日数（要相談にした・要相談から戻した場合は、混雑度の変更として書く）
    if (
      item.congestion !== 'consult' &&
      previous.congestion !== 'consult' &&
      previous.days !== item.days
    ) {
      parts.push(`${item.name} ${daysText(previous)}→${daysText(item)}営業日`)
    }

    if (previous.congestion !== item.congestion) {
      // 要相談から戻したときは、新しい日数も添える（例: プレスを「通常」に変更（4営業日））
      const days =
        previous.congestion === 'consult' && item.days !== null ? `（${item.days}営業日）` : ''
      parts.push(`${item.name}を「${CONGESTION_LABELS[item.congestion]}」に変更${days}`)
    }

    if ((previous.note ?? '') !== (item.note ?? '')) {
      parts.push(`${item.name}の補足を更新`)
    }
  }

  // 並び順（既存の工程どうしの順番が変わったか）
  const beforeOrder = before.items.map((item) => item.id).join(',')
  const afterOrder = after.items
    .filter((item) => item.id !== null)
    .map((item) => item.id)
    .join(',')
  if (beforeOrder !== afterOrder) {
    parts.push('並び順を変更')
  }

  if ((before.message ?? '') !== (after.message ?? '')) {
    parts.push(after.message ? 'メッセージを更新' : 'メッセージを削除')
  } else if (before.expiresOn !== after.expiresOn && after.message) {
    // メッセージは同じで、表示期限だけを変えた
    parts.push('表示期限を変更')
  }

  return parts.length > 0 ? parts.join('、') : null
}
