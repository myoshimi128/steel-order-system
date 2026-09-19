'use client'

// ログイン中ユーザーの情報を、画面のどこからでも参照できるようにする仕組み（React Context）。
// レイアウト（サーバー側）で取得したユーザー情報を、この Provider を通してクライアント
// コンポーネントにも渡せるようにする。

import { createContext, useContext, type ReactNode } from 'react'
import type { CurrentUser } from '@/lib/current-user'

const CurrentUserContext = createContext<CurrentUser | null>(null)

export function CurrentUserProvider({
  user,
  children,
}: {
  user: CurrentUser | null
  children: ReactNode
}) {
  return (
    <CurrentUserContext.Provider value={user}>
      {children}
    </CurrentUserContext.Provider>
  )
}

// クライアントコンポーネントからログイン中ユーザーの情報を取得するためのフック
export function useCurrentUser() {
  return useContext(CurrentUserContext)
}
