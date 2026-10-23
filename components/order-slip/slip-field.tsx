// 現場用伝票の上部の項目 1 つ（小さな見出しと、太字の値）。枠の中に横に並べ、左に区切り線を引く。
// 値がないときは「―」を出す（空欄だと、書き忘れか値がないのか分からないため）。

type SlipFieldProps = {
  label: string
  value: string | null
  // 長い値（得意先・納入先・工事名）は幅を 2 倍にする
  wide?: boolean
}

export function SlipField({ label, value, wide = false }: SlipFieldProps) {
  return (
    <div className={`flex min-w-0 flex-col border-l border-neutral-400 px-2 py-1 first:border-l-0 ${wide ? 'flex-[2]' : 'flex-1'}`}>
      <span className="text-[10px] leading-tight text-neutral-600">{label}</span>
      <span className="truncate text-sm font-semibold leading-snug text-neutral-900">{value || '―'}</span>
    </div>
  )
}
