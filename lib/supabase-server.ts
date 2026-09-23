// サーバー側（Server Components・Server Actions・proxy）から Supabase を使うためのクライアント
// ブラウザ用の lib/supabase.ts と違い、こちらはログイン状態を Cookie 経由で読み書きする必要があるため
// @supabase/ssr が提供する createServerClient を使う

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

// Server Components・Server Actions・Route Handlers から呼び出して使う
// cookies() が非同期関数のため、この関数自体も async にしている
//
// createServerClient<Database>(...) のように型引数を渡すことで、
// .from('customers') のテーブル名や .select('code, name') の列名、
// 外部キーの埋め込み取得（例: materials(name)）の戻り値の形まで
// lib/database.types.ts の内容から推論されるようになる。
// この型ファイルはテーブル定義を変更するたびに `npm run db:types` で再生成する。
export async function createClient() {
  // Next.js が管理している、今のリクエストの Cookie を取得する
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        // Supabase がログイン状態を確認するとき、この関数で Cookie を読みに来る
        getAll() {
          return cookieStore.getAll()
        },
        // ログイン・ログアウト・トークン更新のとき、この関数で Cookie を書き換えに来る
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component のレンダリング中は Cookie を書き換えられない（Next.js の制約）。
            // ログインセッションの更新は proxy.ts（lib/supabase-proxy.ts）側で行っているため、
            // ここで書き換えに失敗しても実害はなく、無視してよい。
          }
        },
      },
    }
  )
}
