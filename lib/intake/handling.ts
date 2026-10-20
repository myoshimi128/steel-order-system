// 対応中の表示の判定（docs/intake/screen-design.md「S-04a 受付待ち一覧」）。
//
// 受付待ちの 1 件を誰かが開くと、intakes.handling_by / handling_at にその人と開始日時が入る（DB の claim_intake）。
// ほかの人の画面には「○○さんが対応中」と出す。
// 開いたまま席を離れた・画面を閉じたのに外れなかった、などで表示が残り続けないよう、
// 開始から 30 分たったものは無効（対応中ではない）とみなす。DB の claim_intake も同じ 30 分で判定する。

export const HANDLING_TIMEOUT_MINUTES = 30

// 対応中の状態。none: 誰も対応していない / self: 自分が対応中 / other: ほかの人が対応中
export type HandlingState = 'none' | 'self' | 'other'

export type HandlingInfo = {
  // 対応中の人の id と名前（いなければ null）
  handlingBy: string | null
  handlingByName: string | null
  // 開始日時（ISO 8601 の文字列）
  handlingAt: string | null
}

// 対応中の表示が有効か（開始から 30 分以内か）
export function isHandlingActive(handlingAt: string | null, now: Date): boolean {
  if (handlingAt === null) return false
  const startedAt = new Date(handlingAt).getTime()
  if (Number.isNaN(startedAt)) return false
  return now.getTime() - startedAt < HANDLING_TIMEOUT_MINUTES * 60 * 1000
}

// 自分から見た対応中の状態
export function handlingStateFor(info: HandlingInfo, userId: string, now: Date): HandlingState {
  if (info.handlingBy === null || !isHandlingActive(info.handlingAt, now)) return 'none'
  return info.handlingBy === userId ? 'self' : 'other'
}

// 「○○さんが対応中」の文。名前が分からないときは「ほかの人が対応中」
export function handlingLabel(name: string | null): string {
  return name ? `${name}さんが対応中` : 'ほかの人が対応中'
}
