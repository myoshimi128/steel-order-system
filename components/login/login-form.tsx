'use client'

// ログインのフォーム（社員No.・パスワード・ログインのボタン・エラー）。
// 送信中の状態とエラーの表示を扱うため、クライアントコンポーネントにする。
// 社員No. からメールアドレスを作ってログインする処理は、Server Action の login（app/actions/auth.ts）で行う。

import { useActionState } from 'react'
import { login } from '@/app/actions/auth'
import { LoginFieldLabel } from './login-field-label'
import { PasswordInput } from './password-input'

// 入力欄の共通の見た目（薄いグレーの地、フォーカスでネイビーの枠）
const INPUT_CLASS =
  'w-full rounded border border-neutral-300 bg-neutral-50 px-3.5 py-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-navy focus:bg-white focus:ring-2 focus:ring-navy/15'

export function LoginForm() {
  // useActionState は [今の状態, フォーム送信用の関数, 送信中かどうか] を返す。
  // 状態の初期値は undefined（エラーなしの状態）
  const [state, formAction, pending] = useActionState(login, undefined)

  return (
    <form action={formAction}>
      <div className="mb-5">
        <LoginFieldLabel htmlFor="employee_no">社員No.</LoginFieldLabel>
        <input
          id="employee_no"
          name="employee_no"
          type="text"
          required
          autoFocus
          // ブラウザのパスワードの保存で、社員No. をユーザー名として扱わせる
          autoComplete="username"
          // 小文字や全角で打っても、サーバー側で大文字・半角にそろえる（lib/employee-login.ts）
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="例：U00123"
          // エラーのあとも、打った社員No. を残す（key を変えて、返ってきた値で欄を作り直す）
          key={state?.employeeNo ?? ''}
          defaultValue={state?.employeeNo ?? ''}
          className={`${INPUT_CLASS} font-mono tracking-[0.05em]`}
        />
      </div>

      <div className="mb-7">
        <LoginFieldLabel htmlFor="password">パスワード</LoginFieldLabel>
        <PasswordInput id="password" name="password" className={INPUT_CLASS} />
      </div>

      {state?.error && (
        // role="alert" で、読み上げソフトにもエラーを知らせる
        <p
          role="alert"
          className="mb-5 rounded border border-urgent/30 bg-urgent/5 px-3 py-2.5 text-sm text-urgent"
        >
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-navy py-3 text-sm font-bold tracking-[0.3em] text-white transition-colors hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? '確認中…' : 'ログイン'}
      </button>
    </form>
  )
}
