// 混雑度の凡例（「混雑度：通常 やや混雑 混雑 要相談」）。ホームの目安納期の下に出す。

import type { Congestion } from '@/lib/intake/constants'
import { CongestionBadge } from './congestion-badge'

const ORDER: Congestion[] = ['normal', 'busy', 'crowded', 'consult']

export function CongestionLegend() {
  return (
    <p className="flex items-center gap-2 text-xs text-neutral-500">
      混雑度：
      {ORDER.map((congestion) => (
        <CongestionBadge key={congestion} congestion={congestion} />
      ))}
    </p>
  )
}
