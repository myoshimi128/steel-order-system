'use server'

// サイドメニューの件数のバッジを読み直す Server Action。
//   ・countWaitingIntakes: 受付登録の項目の「受付待ちの件数」（lib/intake/use-waiting-intake-count.ts）
//   ・countActiveCad     : CAD の項目の「作業待ち・作業中のアイトレの件数」（lib/intake/use-active-cad-count.ts）
// 受付・加工区分の変更を Realtime で受け取ったときに、ブラウザから呼ぶ。
// 受付・加工区分は RLS で事務・管理者だけが読めるため、ほかのユーザーが呼んでも 0 件になる。

import { countActiveCadUnits } from '@/lib/intake/load-cad-units'
import { countIntakes } from '@/lib/intake/load-intakes'
import { createClient } from '@/lib/supabase-server'

export async function countWaitingIntakes(): Promise<number | null> {
  const supabase = await createClient()
  try {
    return await countIntakes(supabase, 'waiting')
  } catch (error) {
    // 数えられなかったときは null を返し、画面は今の件数のままにする
    console.error(error)
    return null
  }
}

export async function countActiveCad(): Promise<number | null> {
  const supabase = await createClient()
  try {
    return await countActiveCadUnits(supabase)
  } catch (error) {
    console.error(error)
    return null
  }
}
