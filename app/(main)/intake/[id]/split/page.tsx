// 振り分け（S-04d）。受付登録済のタブの「振り分け」と、受付登録（処理区分 0 新規）の後に開く。
// URL の [id] は受付の id。受付登録済（振り分け待ち）でない受付は、振り分けの画面を出さない
// （振り分け完了の後は、元データが消えているため、振り分けをやり直さない）。
// ?notice=registered&no=… は受付登録のすぐ後に開いたときのお知らせ。
// 画面の中身は SplitScreen（components/intake/split/split-screen.tsx）。

import Link from 'next/link'
import type { ReactNode } from 'react'
import { SplitScreen } from '@/components/intake/split/split-screen'
import { getCurrentUser } from '@/lib/auth'
import { loadIntakeDetail } from '@/lib/intake/load-intakes'
import { intakeListHref, intakeNoticeText } from '@/lib/intake/tabs'
import { createClient } from '@/lib/supabase-server'

type SplitPageProps = {
  // URL の [id] と ? より後ろの値。Next.js 16 では Promise で渡される
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Message({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-6 py-8 text-sm text-neutral-600">
      <p>{children}</p>
      <Link href={intakeListHref({ tab: 'registered' })} className="mt-4 inline-block text-navy underline">
        受付登録済の一覧に戻る
      </Link>
    </main>
  )
}

export default async function SplitPage({ params, searchParams }: SplitPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return <Message>この画面を開く権限がありません。</Message>
  }
  // uuid の形でない値を DB に渡すとエラーになるため、先に確かめる
  if (!UUID_PATTERN.test(id)) return <Message>受付が見つかりません。</Message>

  const supabase = await createClient()
  const intake = await loadIntakeDetail(supabase, { id })
  if (!intake) return <Message>受付が見つかりません（削除された可能性があります）。</Message>
  if (intake.status === 'dispatched' || intake.status === 'closed') {
    return <Message>受付No. {intake.intakeNo} の振り分けは終わっています。</Message>
  }
  if (intake.status !== 'registered') {
    return <Message>この受付は受付登録が済んでいないため、振り分けできません。</Message>
  }

  return <SplitScreen key={intake.id} intake={intake} notice={intakeNoticeText(query.notice, query.no)} />
}
