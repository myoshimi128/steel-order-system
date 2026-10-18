'use server'

// ログイン・ログアウトを行う Server Action。
// ファイルの先頭に 'use server' を付けると、ここに書いた関数はブラウザから
// フォームの action や useActionState 経由でそのまま呼び出せる（実行はサーバー側で行われる）。
//
// ログインは社員No. とパスワードで行う（docs/basic-design.md「ログイン」）。
// 社員No. から決まった形のメールアドレスを作り、Supabase Auth に渡す（lib/employee-login.ts）。

import { redirect } from 'next/navigation'
import { employeeNoToEmail, normalizeEmployeeNo } from '@/lib/employee-login'
import { createClient } from '@/lib/supabase-server'

// error: 画面に出すエラーの文。employeeNo: エラーのあとも社員No. の欄に打った値を残すために返す
// （フォームの送信のあと、React は入力欄を空に戻すため）
export type LoginState = { error: string; employeeNo: string } | undefined

// 失敗したときの文は 1 つにする。社員No. の形の違い・存在しない社員No.・パスワードの間違い・無効のユーザーを
// 区別して表示すると、どの社員No. が存在するかを外から確かめられてしまうため
const LOGIN_FAILED_MESSAGE = '社員No. またはパスワードが正しくありません'

// useActionState に渡す関数は (これまでの状態, フォームデータ) の順で受け取る
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const employeeNoInput = formData.get('employee_no')
  const password = formData.get('password')
  const typed = typeof employeeNoInput === 'string' ? employeeNoInput : ''

  if (!typed.trim() || typeof password !== 'string' || !password) {
    return { error: '社員No. とパスワードを入力してください', employeeNo: typed }
  }

  // 形に合わない社員No. は、Supabase に問い合わせずに同じ文を返す
  const employeeNo = normalizeEmployeeNo(typed)
  if (!employeeNo) {
    return { error: LOGIN_FAILED_MESSAGE, employeeNo: typed }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: employeeNoToEmail(employeeNo),
    password,
  })

  if (error || !data.user) {
    return { error: LOGIN_FAILED_MESSAGE, employeeNo: typed }
  }

  // 無効（退職など）のユーザーは、ログインした直後にログアウトさせる。
  // ログインした後のクライアントはそのユーザーの権限で動くため、自分の users の行を読める（RLS）
  const { data: profile } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (!profile?.is_active) {
    await supabase.auth.signOut()
    return { error: LOGIN_FAILED_MESSAGE, employeeNo: typed }
  }

  // redirect() は内部で例外を投げてページ遷移を行う仕組みのため、try/catch の外側で呼ぶ
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
