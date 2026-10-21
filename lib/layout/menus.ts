// サイドメニューとパンくずの定義（docs/basic-design.md「画面構成」、docs/screen-design.md「共通レイアウト」）。
//
// メニューの中身はデータとして持ち、表示するコンポーネント（components/layout/）とは切り離す。
// どのメニューを出すか・どの項目を強調するかは、URL（pathname）から決める純粋な関数にしてテストする。

// アイコンの名前。components/layout/icons.tsx の Icon コンポーネントがこの名前で SVG を出し分ける
export type IconName =
  | 'home'
  | 'trend'
  | 'factory'
  | 'layers'
  | 'truck'
  | 'yen'
  | 'pin'
  | 'document'
  | 'box'
  | 'news'
  | 'gear'
  | 'inbox'
  | 'monitor'
  | 'pencil'
  | 'image'
  | 'ticket'
  | 'sheet'
  | 'list'
  | 'clock'

export type MenuItem = {
  label: string
  icon: IconName
  // リンク先。null はまだ作っていない画面（メニューに表示するが押せない＝準備中）
  href: string | null
  // この URL で始まる画面を開いているとき、項目を強調する（省略時は href と完全一致）。
  // 例: 受注登録（/orders/new）は /orders 以下のどの画面でも強調する
  activePrefix?: string
  // 「提案」の印（まだ構想段階の機能）
  proposal?: boolean
  // 件数のバッジ（どの件数を出すか）。件数そのものは共通レイアウトが読み、Sidebar に渡す
  badge?: MenuBadgeKey
}

// 件数のバッジの種類。
//   intakeWaiting: 受付待ちの件数（受付登録の項目に出す）
//   cadActive    : 作業待ち・作業中のアイトレの件数（CAD の項目に出す）
//   orderReady   : 受注登録待ちの件数（受注登録の項目に出す。ログイン中のユーザーの営業所の分、管理者は全部）
export type MenuBadgeKey = 'intakeWaiting' | 'cadActive' | 'orderReady'

export type MenuBadgeCounts = Partial<Record<MenuBadgeKey, number>>

export type MenuSection = {
  // 見出し（「部署」「業務」など）。null は見出しなし
  title: string | null
  items: MenuItem[]
}

export type Menu = {
  kind: 'home' | 'shearing'
  sections: MenuSection[]
}

// ホームのメニュー。部署・営業所は、シャーリング部以外はメニューのみ（準備中）
export const HOME_MENU: Menu = {
  kind: 'home',
  sections: [
    { title: null, items: [{ label: 'ホーム', icon: 'home', href: '/' }] },
    {
      title: '部署',
      items: [
        { label: '営業部', icon: 'trend', href: null },
        { label: '加工部', icon: 'factory', href: null },
        { label: 'シャーリング部', icon: 'layers', href: '/shearing' },
        { label: '配送部', icon: 'truck', href: null },
        { label: '経理／総務', icon: 'yen', href: null },
      ],
    },
    {
      title: '営業所',
      items: [
        { label: 'A営業所', icon: 'pin', href: null },
        { label: 'B営業所', icon: 'pin', href: null },
      ],
    },
    {
      title: '共通',
      items: [
        { label: '受注管理', icon: 'document', href: null },
        { label: '在庫管理', icon: 'box', href: null, proposal: true },
        { label: '社内連絡', icon: 'news', href: null },
        { label: 'マスタ管理', icon: 'gear', href: '/masters', activePrefix: '/masters' },
      ],
    },
  ],
}

// シャーリング部のメニュー。今ある画面（受付登録・CAD・受注登録・納期連絡・マスタ管理）だけを押せるようにする
export const SHEARING_MENU: Menu = {
  kind: 'shearing',
  sections: [
    { title: null, items: [{ label: '部署ホーム', icon: 'home', href: '/shearing' }] },
    {
      title: '業務',
      items: [
        { label: '受付登録', icon: 'inbox', href: '/intake', activePrefix: '/intake', badge: 'intakeWaiting' },
        { label: 'CAD', icon: 'monitor', href: '/cad', badge: 'cadActive' },
        // 受注登録は受注登録待ち（起票待ちのカゴ）の一覧から始める。受注登録の画面（/orders/new）を開いている間も強調する
        { label: '受注登録', icon: 'pencil', href: '/orders/queue', activePrefix: '/orders', badge: 'orderReady' },
        { label: '加工図面発行', icon: 'image', href: null },
        { label: '送り状発行', icon: 'ticket', href: null },
        { label: 'ミルシート作成', icon: 'sheet', href: null },
        { label: '受注管理', icon: 'list', href: null },
        { label: '納期連絡', icon: 'clock', href: '/shearing/lead-time' },
        { label: '在庫・材料', icon: 'box', href: null, proposal: true },
        { label: 'マスタ管理', icon: 'gear', href: '/masters', activePrefix: '/masters' },
      ],
    },
  ],
}

// URL から表示するメニューを決める。
// ホーム（/）だけホームのメニューにし、それ以外はシャーリング部のメニューにする
// （今ある画面はすべてシャーリング部の業務のため。部署が増えたらここで振り分ける）
export function selectMenu(pathname: string): Menu {
  return pathname === '/' ? HOME_MENU : SHEARING_MENU
}

// 項目を強調するか（今開いている画面の項目か）
export function isMenuItemActive(item: MenuItem, pathname: string): boolean {
  if (item.href === null) return false
  if (item.activePrefix) {
    // '/orders' なら '/orders' そのものと '/orders/〇〇' に当てはまる（'/orders-x' には当てはまらない）
    return pathname === item.activePrefix || pathname.startsWith(`${item.activePrefix}/`)
  }
  return pathname === item.href
}

export type Breadcrumb = {
  label: string
  // リンク先。null は今いる画面（最後の項目）
  href: string | null
}

// URL からパンくずを作る（ヘッダーのシステム名の右に「› シャーリング部 › 受注登録」のように出す）。
// ホーム（/）では何も出さない
export function buildBreadcrumbs(pathname: string): Breadcrumb[] {
  if (pathname === '/') return []

  const shearing: Breadcrumb = { label: 'シャーリング部', href: '/shearing' }

  if (pathname === '/shearing') return [{ ...shearing, href: null }]

  // シャーリング部のメニューの項目のうち、今の画面に当てはまるものを最後の項目にする
  const current = SHEARING_MENU.sections
    .flatMap((section) => section.items)
    .find((item) => item.href !== '/shearing' && isMenuItemActive(item, pathname))

  return current ? [shearing, { label: current.label, href: null }] : [shearing]
}
