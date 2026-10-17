// フォームの action に Server Action（logout）を直接渡している。
// クリックされるとサーバー側で logout() が実行され、Cookie のセッションが削除されて /login に戻る。
// このコンポーネント自体はサーバー側で描画できるので 'use client' は不要。
//
// 置く場所（ネイビーのヘッダーなど）で見た目が変わるため、ボタンのクラスは呼び出し側から渡せるようにする

import { logout } from '@/app/actions/auth'

export function LogoutButton({
  className = 'text-sm text-neutral-600 hover:text-neutral-900',
}: {
  className?: string
}) {
  return (
    <form action={logout}>
      <button type="submit" className={className}>
        ログアウト
      </button>
    </form>
  )
}
