// proxy.ts（旧 middleware.ts。Next.js 16 でファイル名・関数名が変わったが挙動は同じ）から
// 呼び出す、ログインセッションを更新するための処理。
//
// Supabase のアクセストークンには有効期限があり、期限が切れる前に自動更新（リフレッシュ）する
// 必要がある。この更新をページの描画時（Server Component）だけに任せると更新が漏れることがあるため、
// 全リクエストの入口である proxy で毎回チェックする。
// あわせて、未ログイン時は /login へ、ログイン済みで /login を開いたときはトップページへ
// リダイレクトする。

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ログインしていなくても表示してよいパス
const PUBLIC_PATHS = ['/login']

export async function updateSession(request: NextRequest) {
  // 更新後の Cookie を積んでいく先のレスポンス。最初は「そのまま通す」状態で用意する
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // request 側にも反映しておかないと、この後 supabase.auth.getUser() を呼んだときに
          // 更新前の古い Cookie を見てしまう
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() は Supabase Auth サーバーに問い合わせてアクセストークンの有効性を確認する。
  // 期限切れが近ければこのタイミングで自動的にリフレッシュされ、新しい Cookie が
  // 上の setAll を通じてレスポンスにセットされる。
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path))

  // 未ログインで、ログイン不要なページ以外にアクセスしたとき → ログイン画面へ
  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // ログイン済みで、ログイン画面にアクセスしたとき → トップページへ
  if (user && isPublicPath) {
    const topUrl = request.nextUrl.clone()
    topUrl.pathname = '/'
    return NextResponse.redirect(topUrl)
  }

  return response
}
