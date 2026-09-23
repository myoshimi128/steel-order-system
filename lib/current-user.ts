// ログイン中ユーザーの情報を、アプリ内で共通の型として扱うための定義
// role は public.users.role（マイグレーションで 'office' / 'factory' / 'admin' に制約している）と対応させる

export type UserRole = 'office' | 'factory' | 'admin'

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: UserRole
}
