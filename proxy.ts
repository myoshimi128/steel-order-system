// Next.js 16 では middleware.ts は非推奨となり proxy.ts に名前が変わった
// （挙動は同じで、ファイル名とエクスポート名だけが変わっている）。
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md 参照。
//
// ここではログインセッションの更新と、未ログイン時のリダイレクトを行う
// lib/supabase-proxy.ts の updateSession() に処理を委譲している。

import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase-proxy'

export function proxy(request: NextRequest) {
  return updateSession(request)
}

// 静的ファイル（ビルド成果物・画像・favicon）にまでログインチェックをかけると無駄なので除外する
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
