// 受付登録（S-04c）の処理区分「0 新規」。受付待ち一覧の「この内容で受付登録」と、手動で受付を追加の後に開く。
// URL の [id] は受付の id。受付待ちでない受付（すでに登録済みなど）は、処理区分「1 変更」の画面へ移す。
// 画面の中身は IntakeRegisterScreen（components/intake/register/intake-register-screen.tsx）。

import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { IntakeRegisterScreen } from '@/components/intake/register/intake-register-screen'
import { getCurrentUser } from '@/lib/auth'
import { loadIntakeDetail } from '@/lib/intake/load-intakes'
import { loadIntakeRegisterContext } from '@/lib/intake/load-register-context'
import { createClient } from '@/lib/supabase-server'

type IntakeRegisterPageProps = {
  // URL の [id] の部分。Next.js 16 では Promise で渡される
  params: Promise<{ id: string }>
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function Message({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-6 py-8 text-sm text-neutral-600">
      <p>{children}</p>
      <Link href="/intake" className="mt-4 inline-block text-navy underline">
        受付待ち一覧に戻る
      </Link>
    </main>
  )
}

export default async function IntakeRegisterPage({ params }: IntakeRegisterPageProps) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return <Message>この画面を開く権限がありません。</Message>
  }
  // uuid の形でない値を DB に渡すとエラーになるため、先に確かめる
  if (!UUID_PATTERN.test(id)) return <Message>受付が見つかりません。</Message>

  const supabase = await createClient()
  const [intake, context] = await Promise.all([
    loadIntakeDetail(supabase, { id }),
    loadIntakeRegisterContext(user),
  ])
  if (!intake) return <Message>受付が見つかりません（削除された可能性があります）。</Message>

  if (intake.status !== 'waiting') {
    // 登録済みの受付は、変更の画面で開き直す
    if (intake.intakeNo && ['registered', 'dispatched', 'closed'].includes(intake.status)) {
      redirect(`/intake/register?type=1&no=${intake.intakeNo}`)
    }
    return <Message>この受付は受付待ちではないため、受付登録できません。</Message>
  }

  return (
    <IntakeRegisterScreen
      // 別の受付を開いたら、入力の状態を作り直す（key が変わると、React は別の部品として作り直す）
      key={intake.id}
      mode="new"
      intake={intake}
      lookupNo=""
      lookupError={null}
      masters={context.masters}
      defaults={context.defaults}
      today={context.today}
      userId={user.id}
      userName={user.name}
    />
  )
}
