// 部署ホーム（S-02）の件数のカード（画面イメージ 02 の上の 4 つの枠）。
// 左にアイコン、大きな数字と名前、右に「›」。href があればカード全体がその一覧へのリンクになる。
// 件数が null（数えられない・権限がない）のときは「—」を出す。

import Link from 'next/link'
import { Icon, type AnyIconName } from '@/components/layout/icon'

type SummaryCardProps = {
  icon: AnyIconName
  label: string
  count: number | null
  // 押したときに開く一覧（一覧の画面がまだないものは省略し、押せないカードにする）
  href?: string
}

export function SummaryCard({ icon, label, count, href }: SummaryCardProps) {
  const body = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-navy-soft text-navy">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-3xl font-bold leading-tight text-neutral-900 tabular-nums">{count ?? '—'}</span>
        <span className="text-sm text-neutral-600">{label}</span>
      </span>
      {href && <span className="text-lg text-neutral-400">›</span>}
    </>
  )

  const className = 'flex items-center gap-4 rounded border border-line bg-white px-5 py-4'
  return href ? (
    <Link href={href} className={`${className} hover:border-navy/40 hover:bg-navy-soft/30`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )
}
