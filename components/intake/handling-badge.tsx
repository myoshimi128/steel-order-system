// 「○○さんが対応中」の印（受付待ち一覧の行・メールの中身・受付登録の画面）。
// ほかの人が受付待ちの 1 件を開いているときに出す（二重登録を防ぐため。開始から 30 分で消える）。

export function HandlingBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-attention/40 bg-attention-soft px-2 py-0.5 text-[11px] font-semibold text-attention">
      <span className="h-1.5 w-1.5 rounded-full bg-attention" aria-hidden="true" />
      {label}
    </span>
  )
}
