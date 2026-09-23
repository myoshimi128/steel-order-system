// ログイン中ユーザーの情報（氏名・ロールなど）を取得する
// Server Component（layout.tsx など）から呼び出して使う

import { cache } from 'react'
import { createClient } from '@/lib/supabase-server'
import type { CurrentUser, UserRole } from '@/lib/current-user'

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

  // public.users からロールなどの業務データを取得する
  // id は auth.users.id と同じ値（マイグレーションで FK 制約をかけている）
  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return null
  }

  return {
    id: user.id,
    email: user.email ?? '',
    name: profile.name,
    // users.role は DB 上は text 列（CHECK 制約で office/factory/admin に限定）で
    // Postgres の enum 型ではないため、生成された型では string にしかならない。
    // 値そのものは CHECK 制約が保証しているので、ここで UserRole にキャストする。
    role: profile.role as UserRole,
  }
})
