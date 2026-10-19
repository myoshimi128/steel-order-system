// 納期連絡（S-03）。シャーリング部のメニューの「納期連絡」から開く。
// URL の ?dept=processing で加工部の納期連絡に切り替える（指定なしはシャーリング部）。
// 画面の中身は LeadTimeEditor（components/lead-time-editor/lead-time-editor.tsx）。

import { LeadTimeEditor } from '@/components/lead-time-editor/lead-time-editor'
import { getCurrentUser } from '@/lib/auth'
import { loadLeadTimeBoards, loadLeadTimeHistory } from '@/lib/lead-time/load-lead-times'
import { parseLeadTimeDept } from '@/lib/lead-time/types'
import { todayInJapan } from '@/lib/order-entry/date'

type LeadTimePageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LeadTimePage({ searchParams }: LeadTimePageProps) {
  const { dept: deptParam } = await searchParams
  const dept = parseLeadTimeDept(deptParam)

  // ユーザー・目安納期・更新履歴を並行して読む
  const [user, [board], history] = await Promise.all([
    getCurrentUser(),
    loadLeadTimeBoards([dept]),
    loadLeadTimeHistory(dept),
  ])

  // 編集できるのは事務・管理者（DB の関数と RLS でも強制している）
  const editable = user?.role === 'office' || user?.role === 'admin'

  return (
    <LeadTimeEditor
      // 部署を切り替えたら、入力の状態を作り直す（key が変わると、React は別の部品として作り直す）
      key={dept}
      board={board}
      history={history}
      editable={editable}
      today={todayInJapan()}
    />
  )
}
