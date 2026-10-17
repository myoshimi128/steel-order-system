// ログイン中ユーザーの情報を、アプリ内で共通の型として扱うための定義
// role は public.users.role（マイグレーションで 'office' / 'factory' / 'admin' に制約している）と対応させる

export type UserRole = 'office' | 'factory' | 'admin'

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: UserRole
}

// role をそのまま表示すると事務側が読みづらいため、日本語の名前に変換する（ヘッダーの表示などで使う）
export const ROLE_LABEL: Record<UserRole, string> = {
  office: '事務',
  factory: '現場',
  admin: '管理者',
}
