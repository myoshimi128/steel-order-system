// ブラウザ（クライアントコンポーネント）から Supabase を使うためのクライアント。
// 今は Realtime（通知の新着を受け取る）にだけ使う。データの読み書きは、これまでどおり
// サーバー側（Server Component・Server Action。lib/supabase-server.ts）で行う。
//
// createBrowserClient は、ログイン状態を Cookie から読む（サーバー側と同じログインを使う）。
// ブラウザでは何度呼んでも同じクライアントを返すため、コンポーネントごとに呼んでよい。

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
