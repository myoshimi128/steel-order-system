'use client'

// 納期連絡の部署の切り替え（シャーリング部 / 加工部）。
// 加工部の納期連絡も同じ画面を使い、URL の ?dept=processing で切り替える（未決事項 Q-7 の決定。
// 入り口はシャーリング部のメニューだけ）。
// 公開していない入力があるときは、切り替える前に確かめる（切り替えると入力が消えるため）。

import Link from 'next/link'
import { DEPARTMENT_LABELS } from '@/lib/intake/constants'
import { EDITOR_LEAD_TIME_DEPTS, type LeadTimeDept } from '@/lib/lead-time/types'

type LeadTimeDeptTabsProps = {
  current: LeadTimeDept
  // 公開していない入力があるか
  dirty: boolean
}

// 部署ごとの URL（シャーリング部は ?dept を付けない）
function hrefFor(dept: LeadTimeDept): string {
  return dept === 'shearing' ? '/shearing/lead-time' : `/shearing/lead-time?dept=${dept}`
}

export function LeadTimeDeptTabs({ current, dirty }: LeadTimeDeptTabsProps) {
  return (
    <nav aria-label="部署の切り替え" className="flex gap-1 border-b border-line">
      {EDITOR_LEAD_TIME_DEPTS.map((dept) => {
        const active = dept === current
        return (
          <Link
            key={dept}
            href={hrefFor(dept)}
            // aria-current で、今開いている部署を読み上げに伝える
            aria-current={active ? 'page' : undefined}
            onClick={(event) => {
              if (active) return
              if (dirty && !window.confirm('公開していない入力があります。切り替えると入力は消えます。よろしいですか？')) {
                // 「キャンセル」なら移動しない
                event.preventDefault()
              }
            }}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              active
                ? 'border-navy font-bold text-navy'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            {DEPARTMENT_LABELS[dept]}
          </Link>
        )
      })}
    </nav>
  )
}
