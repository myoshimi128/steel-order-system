'use client'

// フォーム入力・送信中の状態・エラー表示を扱うため、ここだけクライアントコンポーネントにする

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export function LoginForm() {
  // useActionState は [今の状態, フォーム送信用の関数, 送信中かどうか] を返す
  // 状態の初期値は undefined（エラーなしの状態）
  const [state, formAction, pending] = useActionState(login, undefined)

  return (
    <form action={formAction} className="flex w-80 flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? 'ログイン中…' : 'ログイン'}
      </button>
    </form>
  )
}
