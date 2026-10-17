// スタンプのチェックの状態（docs/screen-design.md「補助エリア」）。
//
// スタンプは、チェックしたものが現場用伝票に印字される文言。チェックの状態は次の 2 つを合わせて決める。
//   ・得意先の指定スタンプ（customer_stamps）: 得意先を選んだ時点でチェックが入る（「客先指定」の印）
//   ・手での付け外し（overrides）: 番号を打って Enter、またはクリックで付け外ししたもの。
//     指定スタンプをその受注だけ外すこともできる。得意先を変えても、手で付け外ししたものはそのまま残す
// スプライス専用の受注の「ショット加工」は、ここでは扱わない（orders.splice_shot から表示・印字し、保存しない）。
// 画面に依存しない純粋な関数にしてテストで確認する。

// --- マスタ（page.tsx でサーバーから取得して渡す） ---

export type StampMaster = {
  id: string
  // 番号。受注登録画面で番号を打って付け外しする。並び順にも使う
  number: number
  body: string
}

// 得意先の指定スタンプ（customer_stamps）
export type CustomerStampMaster = {
  customer_id: string
  stamp_id: string
}

// 手で付け外ししたスタンプ（スタンプの id → チェックするか）
export type StampOverrides = Readonly<Record<string, boolean>>

export type StampState = {
  stamp: StampMaster
  checked: boolean
  // 得意先の指定スタンプか（「客先指定」の印を付ける）
  designated: boolean
}

// 得意先の指定スタンプの id
export function designatedStampIds(
  customerStamps: readonly CustomerStampMaster[],
  customerId: string | null,
): ReadonlySet<string> {
  if (!customerId) {
    return new Set()
  }
  return new Set(
    customerStamps.filter((row) => row.customer_id === customerId).map((row) => row.stamp_id),
  )
}

// スタンプごとのチェックの状態（番号順）。
// 手で付け外ししたものはその状態、それ以外は指定スタンプならチェックあり
export function stampStates(
  stamps: readonly StampMaster[],
  designated: ReadonlySet<string>,
  overrides: StampOverrides,
): StampState[] {
  return [...stamps]
    .sort((a, b) => a.number - b.number)
    .map((stamp) => {
      const isDesignated = designated.has(stamp.id)
      return {
        stamp,
        checked: overrides[stamp.id] ?? isDesignated,
        designated: isDesignated,
      }
    })
}

// スタンプを付け外しした後の overrides（今の状態を反転したものを覚える）
export function toggleStamp(
  states: readonly StampState[],
  overrides: StampOverrides,
  stampId: string,
): StampOverrides {
  const state = states.find((item) => item.stamp.id === stampId)
  if (!state) {
    return overrides
  }
  return { ...overrides, [stampId]: !state.checked }
}

// 番号からスタンプを探す（番号の欄で打った番号）。見つからなければ undefined
export function findStampByCode(
  stamps: readonly StampMaster[],
  code: string,
): StampMaster | undefined {
  const trimmed = code.trim()
  if (!/^\d+$/.test(trimmed)) {
    return undefined
  }
  return stamps.find((stamp) => stamp.number === Number(trimmed))
}

// チェックの入っているスタンプの id（保存するもの）
export function checkedStampIds(states: readonly StampState[]): string[] {
  return states.filter((state) => state.checked).map((state) => state.stamp.id)
}

