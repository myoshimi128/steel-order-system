// ログイン中ユーザーの情報（氏名・ロールなど）を取得する
// Server Component（layout.tsx など）から呼び出して使う

import { cache } from 'react'
import { createClient } from '@/lib/supabase-server'
import type { CurrentUser, UserRole } from '@/lib/current-user'
import type { Department } from '@/lib/intake/constants'

// React の cache() で包むと、同じリクエストの中で何度呼び出してもデータ取得は1回だけになる
// （layout と page の両方で呼んでも二重にクエリが飛ばない）
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient()

  // auth.users 側のログイン情報を取得する
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 未ログインの場合は null を返す
  // （通常はここに来る前に proxy.ts が /login へリダイレクトしている）
  if (!user) {
    return null
  }

  // public.users からロール・社員No.・部署・営業所などの業務データを取得する
  // id は auth.users.id と同じ値（マイグレーションで FK 制約をかけている）。
  // sites(name) は外部キー（site_id）をたどって、営業所の名前を一緒に取る書き方
  const { data: profile } = await supabase
    .from('users')
    .select('name, role, employee_no, department, site_id, sites(name)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return null
  }

  return {
    id: user.id,
    // 社員No. は必須の列（20261019100000_employee_no_login.sql）。型を作り直す前は null 可のため ?? で補う
    employeeNo: profile.employee_no ?? '',
    name: profile.name,
    // users.role・department は DB 上は text 列（CHECK 制約で値を限定）で
    // Postgres の enum 型ではないため、生成された型では string にしかならない。
    // 値そのものは CHECK 制約が保証しているので、ここでキャストする。
    role: profile.role as UserRole,
    department: profile.department as Department | null,
    siteId: profile.site_id,
    siteName: profile.sites?.name ?? null,
  }
})
