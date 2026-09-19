// フォームの action に Server Action（logout）を直接渡している。
// クリックされるとサーバー側で logout() が実行され、Cookie のセッションが削除されて /login に戻る。
// このコンポーネント自体はサーバー側で描画できるので 'use client' は不要。

import { logout } from '@/app/actions/auth'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
      >
        ログアウト
      </button>
    </form>
  )
}
