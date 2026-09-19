import { LoginForm } from './login-form'

// ユーザー登録画面は作らない方針のため、ここにはログインフォームのみを置く
// （アカウントの作成は管理者が Supabase の管理画面で行う運用。
//  supabase/migrations の handle_new_auth_user トリガーが public.users 側の行を自動作成する）
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8">
      <h1 className="text-xl font-semibold">受注管理システム ログイン</h1>
      <LoginForm />
    </main>
  )
}
