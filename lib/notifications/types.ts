// 通知（notifications）を画面で扱うための型。docs/intake/table-design.md「notifications / notification_reads」

export type NotificationItem = {
  id: string
  // 通知の種類（受付の新着は intake_new）
  kind: string
  title: string
  body: string | null
  // 作られた日時（ISO 8601 の文字列）
  createdAt: string
}

// notifications の 1 行（DB の列名のまま）。Realtime で届く行も同じ形
export type NotificationRow = {
  id: string
  kind: string
  title: string
  body: string | null
  created_at: string
}

export function toNotificationItem(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  }
}

// ベルの一覧に持っておく未読の通知の件数の上限（それより古いものは「ほか○件」）
export const UNREAD_LIST_LIMIT = 20
