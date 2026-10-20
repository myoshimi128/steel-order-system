'use server'

// サイドメニューの件数のバッジ（受付登録の項目の「受付待ちの件数」）を読み直す Server Action。
// 受付の変更を Realtime で受け取ったときに、ブラウザから呼ぶ（lib/intake/use-waiting-intake-count.ts）。
// 受付は RLS で事務・管理者だけが読めるため、ほかのユーザーが呼んでも 0 件になる。

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
