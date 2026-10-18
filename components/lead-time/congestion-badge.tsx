// 混雑度の印（通常／やや混雑／混雑／要相談）。
// 混むほど濃いネイビーにし、赤は「要相談」だけに使う（docs/screen-design.md「共通レイアウト」の色）。

import { CONGESTION_LABELS, type Congestion } from '@/lib/intake/constants'

// 混雑度ごとの色
const CONGESTION_CLASSES: Record<Congestion, string> = {
  normal: 'border border-neutral-300 bg-white text-neutral-700',
  busy: 'bg-navy-soft text-navy',
  crowded: 'bg-navy text-white',
  consult: 'bg-urgent text-white',
}

export function CongestionBadge({ congestion }: { congestion: Congestion }) {
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold leading-tight ${CONGESTION_CLASSES[congestion]}`}
    >
      {CONGESTION_LABELS[congestion]}
    </span>
  )
}
