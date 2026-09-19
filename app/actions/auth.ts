'use server'

// ログイン・ログアウトを行う Server Action。
// ファイルの先頭に 'use server' を付けると、ここに書いた関数はブラウザから
// フォームの action や useActionState 経由でそのまま呼び出せる（実行はサーバー側で行われる）。

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export type LoginState = { error: string } | undefined

// useActionState に渡す関数は (これまでの状態, フォームデータ) の順で受け取る
export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email')
  const password = formData.get('password')

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email ||
    !password
  ) {
    return { error: 'メールアドレスとパスワードを入力してください' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    // 「メールアドレスが存在しない」「パスワードが違う」を区別せず同じ文言にする。
    // 区別して表示すると、不正ログインを試みる側にヒントを与えてしまうため。
    return { error: 'メールアドレスまたはパスワードが正しくありません' }
  }

  // redirect() は内部で例外を投げてページ遷移を行う仕組みのため、try/catch の外側で呼ぶ
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
