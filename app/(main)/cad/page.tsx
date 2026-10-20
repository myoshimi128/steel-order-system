// CAD（S-05）。サイドメニューの「CAD」から開く。
// URL の ?tab= でタブ（作業待ち・作業中 / CSV 登録済）、?unit= で選んだ行（加工区分の id）を受け取る。
// 画面の中身は CadScreen（components/cad/cad-screen.tsx）。

import { CadScreen } from '@/components/cad/cad-screen'
import { getCurrentUser } from '@/lib/auth'
import { parseCadTab } from '@/lib/intake/cad'
import { loadCadUnits } from '@/lib/intake/load-cad-units'
import { createClient } from '@/lib/supabase-server'

type CadPageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CadPage({ searchParams }: CadPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  // CAD の作業は事務所（事務・管理者）の業務。現場は使わない（RLS でも加工区分を読めない）
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600">この画面を開く権限がありません。</p>
      </main>
    )
  }

  const units = await loadCadUnits(await createClient())
  const tab = parseCadTab(params.tab)
  const unit = typeof params.unit === 'string' ? params.unit : null

  return <CadScreen units={units} tab={tab} initialUnitId={unit} userId={user.id} />
}
