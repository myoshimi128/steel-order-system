// 共通レイアウトで使う線のアイコン（docs/screen-design.md「共通レイアウト」の「モノクロの線のアイコン」）。
// 名前（lib/layout/menus.ts の IconName）で SVG を出し分ける。
// 線の色は currentColor（親の文字色）になるため、文字色のクラスでアイコンの色も変わる。

import type { ReactNode } from 'react'
import type { IconName } from '@/lib/layout/menus'

// メニュー以外で使うアイコンも同じ部品で出す
export type AnyIconName =
  | IconName
  | 'bell'
  | 'logo'
  | 'chevrons-left'
  | 'chevrons-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'chat'
  | 'check'
  | 'plus'
  | 'x'
  | 'mail'
  | 'search'
  | 'upload'
  | 'paperclip'
  | 'external'
  | 'arrow-right'

// 各アイコンの中身（24 × 24 の座標で描いた線）
const PATHS: Record<AnyIconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M10 21v-6h4v6" />,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  factory: (
    <path d="M3 21V10l5 3V10l5 3V10l5 3V5h3v16H3zM7 17h2M12 17h2M17 17h1" />
  ),
  layers: <path d="M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5M2 18l10 5 10-5" />,
  truck: (
    <>
      <path d="M2 6h12v10H2zM14 10h4l3 3v3h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  yen: <path d="M6 3l6 8 6-8M12 11v10M7 13h10M7 17h10" />,
  pin: (
    <>
      <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  document: <path d="M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h8" />,
  box: <path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10" />,
  news: <path d="M4 4h13v16H4zM17 8h3v10a2 2 0 0 1-2 2M7 8h7M7 12h7M7 16h4" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  inbox: <path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 2h6l1-2h5" />,
  monitor: <path d="M3 4h18v12H3zM8 20h8M12 16v4M7 12l3-3 2 2 4-4" />,
  pencil: <path d="M4 20l1-5L16 4l4 4L9 19zM14 6l4 4" />,
  image: (
    <>
      <path d="M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6" />
      <circle cx="16" cy="8" r="1.5" />
    </>
  ),
  ticket: <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM9 6v12" />,
  sheet: <path d="M5 2h14v20H5zM8 7h8M8 11h8M8 15h5" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
  logo: <path d="M8 4h8v3H8zM6 5H4v17h16V5h-2M8 12h8M8 16h5" />,
  'chevrons-left': <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />,
  'chevrons-right': <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />,
  'arrow-left': <path d="M19 12H5M11 18l-6-6 6-6" />,
  'arrow-up': <path d="M12 19V5M6 11l6-6 6 6" />,
  'arrow-down': <path d="M12 5v14M6 13l6 6 6-6" />,
  // 吹き出し（部署メッセージの印）
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  mail: <path d="M3 5h18v14H3zM3 6l9 7 9-7" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4" />,
  paperclip: <path d="M20 11l-8 8a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
}

export function Icon({ name, className = 'h-5 w-5' }: { name: AnyIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      // 飾りのアイコンのため、読み上げの対象から外す（意味はとなりの文字で伝える）
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
