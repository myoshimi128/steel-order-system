// 加工場所（営業所）ごとのタブ（受注登録待ち S-06a と CAD S-05 で共通）。
//
// タブは URL の ?site= に営業所のコード（honsha・a・b）を持つ（再読み込み・戻るでも同じタブが開くように）。
// 指定がなければ、ログイン中のユーザーの営業所のタブを開く。
// 営業所ごとに CAD・起票の担当がいるため、サイドメニューのバッジ（ログイン中のユーザーの営業所の件数）と
// 最初に開くタブの件数がそろうようにしている（件数の営業所の決め方は lib/intake/queue.ts の countScopeSiteId）。

// 営業所（sites の行）。number は画面の番号（1 本社 / 2 A営業所 / 3 B営業所）で、タブの並びに使う
export type SiteTab = {
  id: string
  number: number
  code: string
  name: string
}

// 開くタブの営業所を決める。URL の ?site= のコード → ユーザーの営業所 → 先頭の営業所 の順に探す
export function selectSiteTab(
  sites: readonly SiteTab[],
  code: string | string[] | undefined,
  userSiteId: string | null
): SiteTab | null {
  return (
    sites.find((site) => site.code === code) ??
    sites.find((site) => site.id === userSiteId) ??
    sites[0] ??
    null
  )
}

// 営業所ごとの件数（タブの件数）。営業所が空の行は数えない
export function countBySite(rows: readonly { siteId: string | null }[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    if (row.siteId === null) continue
    counts.set(row.siteId, (counts.get(row.siteId) ?? 0) + 1)
  }
  return counts
}
