// 受付登録（S-04c）の処理区分「1 変更」「2 削除」。受付No. を打って受付を呼び出す。
//   /intake/register?type=1            … 変更（受付No. をまだ打っていない）
//   /intake/register?type=1&no=26-1003 … 変更（受付No. 26-1003 を呼び出した）
//   /intake/register?type=2&no=26-1003 … 削除
// 受付待ち一覧の「受付No. で呼び出す」「受付の内容を直す」と、受付登録の画面で処理区分を切り替えたときに開く。
// 画面の中身は IntakeRegisterScreen（components/intake/register/intake-register-screen.tsx）。

import Link from 'next/link'
import {
  IntakeRegisterScreen,
  type IntakeRegisterMode,
} from '@/components/intake/register/intake-register-screen'
import { getCurrentUser } from '@/lib/auth'
import type { IntakeStatus } from '@/lib/intake/constants'
import { normalizeIntakeNo } from '@/lib/intake/intake-no'
import { loadIntakeDetail } from '@/lib/intake/load-intakes'
import { loadIntakeRegisterContext } from '@/lib/intake/load-register-context'
import type { IntakeDetail } from '@/lib/intake/types'
import { createClient } from '@/lib/supabase-server'

type IntakeLookupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// 処理区分ごとに、呼び出せる受付の状態
//   変更: 受付登録済・振り分け完了・完了（見積・ミルシートは受注情報を持たないため変更しない）
//   削除: それに見積・ミルシートを足したもの（受付待ち・対象外は削除ではなく「対象外」に区分する）
const ALLOWED_STATUSES: Record<Exclude<IntakeRegisterMode, 'new'>, IntakeStatus[]> = {
  edit: ['registered', 'dispatched', 'closed'],
  delete: ['registered', 'dispatched', 'closed', 'estimate'],
}

export default async function IntakeLookupPage({ searchParams }: IntakeLookupPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600">この画面を開く権限がありません。</p>
        <Link href="/" className="mt-4 inline-block text-sm text-navy underline">
          ホームに戻る
        </Link>
      </main>
    )
  }

  const mode: Exclude<IntakeRegisterMode, 'new'> = params.type === '2' ? 'delete' : 'edit'
  const rawNo = typeof params.no === 'string' ? params.no : ''
  const intakeNo = rawNo === '' ? null : normalizeIntakeNo(rawNo)

  const supabase = await createClient()
  const [found, context] = await Promise.all([
    intakeNo ? loadIntakeDetail(supabase, { intakeNo }) : Promise.resolve(null),
    loadIntakeRegisterContext(user),
  ])

  // 呼び出せなかった理由（受付No. の形・見つからない・この処理区分では扱えない状態）
  let intake: IntakeDetail | null = null
  let lookupError: string | null = null
  if (rawNo !== '' && !intakeNo) {
    lookupError = '受付No. の形が正しくありません（例: 26-1003）'
  } else if (intakeNo && !found) {
    lookupError = `受付No. ${intakeNo} は見つかりません`
  } else if (found && !ALLOWED_STATUSES[mode].includes(found.status)) {
    lookupError =
      found.status === 'estimate'
        ? '見積・ミルシートの受付は変更できません（削除はできます）'
        : 'この受付は' + (mode === 'edit' ? '変更' : '削除') + 'できません'
  } else {
    intake = found
  }

  return (
    <IntakeRegisterScreen
      key={`${mode}:${intake?.id ?? rawNo}`}
      mode={mode}
      intake={intake}
      lookupNo={intakeNo ?? rawNo}
      lookupError={lookupError}
      masters={context.masters}
      defaults={context.defaults}
      today={context.today}
      userId={user.id}
      userName={user.name}
    />
  )
}
