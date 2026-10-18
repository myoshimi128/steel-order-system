// ログイン中ユーザーの情報を、アプリ内で共通の型として扱うための定義
// role は public.users.role（マイグレーションで 'office' / 'factory' / 'admin' に制約している）と対応させる

import { DEPARTMENT_LABELS, type Department } from '@/lib/intake/constants'

export type UserRole = 'office' | 'factory' | 'admin'

export type CurrentUser = {
  id: string
  // 社員No.（U00001 など。ログインに使う）
  employeeNo: string
  name: string
  role: UserRole
  // 部署（未設定は null）
  department: Department | null
  // 所属する営業所（未設定は null）。受付登録の加工場所の初期値に使う
  siteId: string | null
  siteName: string | null
}

// role をそのまま表示すると事務側が読みづらいため、日本語の名前に変換する（ヘッダーの表示などで使う）
export const ROLE_LABEL: Record<UserRole, string> = {
  office: '事務',
  factory: '現場',
  admin: '管理者',
}

// ヘッダーに出す所属（営業所＋部署。例:「本社シャーリング部」）。
// どちらかが未設定なら、ある方だけを出す。両方とも未設定なら空文字
export function formatAffiliation(user: Pick<CurrentUser, 'siteName' | 'department'>): string {
  return `${user.siteName ?? ''}${user.department ? DEPARTMENT_LABELS[user.department] : ''}`
}
