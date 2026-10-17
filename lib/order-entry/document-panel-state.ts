// 受注登録の画面の左に置く「注文書のパネル」の幅と開閉の決め方（docs/screen-design.md「注文書のパネル」）。
//
// ・幅はドラッグで変えられ、cookie に保存する（サーバーが最初から正しい幅で描けるようにするため。
//   サイドメニューの開閉と同じ考え方）
// ・幅の範囲は 240px から「右の中身（明細の表など）が収まる幅」まで
// ・初期の幅（保存がないとき）は、右の中身が収まる範囲で最も広い幅
// ・F2 で開閉する。開閉の状態も cookie に保存する
// 画面に依存しない純粋な関数にしてテストする。

export const DOCUMENT_PANEL_WIDTH_COOKIE = 'order_doc_panel_width'
export const DOCUMENT_PANEL_OPEN_COOKIE = 'order_doc_panel_open'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 年（秒）

// パネルの最小の幅
export const DOCUMENT_PANEL_MIN_WIDTH = 240
// パネルと右の中身の間隔
export const DOCUMENT_PANEL_GAP = 16
// 右の中身の最小の幅。明細の表（792px）＋表の左右の余白（12px × 2）＋スクロールバー（8px）＋カードの枠（1px × 2）
// （components/order-entry/items/item-grid.ts の列の幅と合わせる）
export const RIGHT_CONTENT_MIN_WIDTH = 826

// 保存されている幅を読む（なければ null。初期の幅を使う）
export function parsePanelWidthCookie(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null
  }
  return Number(value)
}

// 保存されている開閉を読む（保存がなければ開いた状態）
export function parsePanelOpenCookie(value: string | undefined): boolean {
  return value !== '0'
}

export function panelWidthCookieString(width: number): string {
  return `${DOCUMENT_PANEL_WIDTH_COOKIE}=${Math.round(width)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

export function panelOpenCookieString(open: boolean): string {
  return `${DOCUMENT_PANEL_OPEN_COOKIE}=${open ? '1' : '0'}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
}

// パネルの最大の幅。画面の中身の幅から、右の中身の最小の幅と間隔を除いた幅
// （狭すぎる画面でも最小の幅は確保する）
export function maxPanelWidth(containerWidth: number): number {
  return Math.max(DOCUMENT_PANEL_MIN_WIDTH, containerWidth - DOCUMENT_PANEL_GAP - RIGHT_CONTENT_MIN_WIDTH)
}

// 表示する幅。保存した幅を、今の画面で取れる範囲に収める。保存がなければ取れる範囲で最も広い幅
export function displayPanelWidth(savedWidth: number | null, containerWidth: number): number {
  const max = maxPanelWidth(containerWidth)
  if (savedWidth === null) {
    return max
  }
  return Math.min(max, Math.max(DOCUMENT_PANEL_MIN_WIDTH, savedWidth))
}
