'use client'

// フォーム入力・送信中の状態・エラー表示・パスワード表示切り替えを扱うため、
// ここだけクライアントコンポーネントにする。
// 見た目は Figma Make で作成したデザイン案（カード型、アンバー基調）を反映している。
// 認証ロジック（Server Action の login）自体は変更していない。

import { useState } from 'react'
import { useActionState } from 'react'
import { login } from '@/app/actions/auth'

export function LoginForm() {
  // useActionState は [今の状態, フォーム送信用の関数, 送信中かどうか] を返す
  // 状態の初期値は undefined（エラーなしの状態）
  const [state, formAction, pending] = useActionState(login, undefined)

  // パスワードを平文表示するかどうかの切り替え。入力値そのものは保持しない
  // （フォーム送信は uncontrolled input のまま FormData 経由で行うため）
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction}>
      {/* メールアドレス */}
      <div className="mb-4">
        <label
          htmlFor="email"
          className="mb-[7px] block text-[11px] font-medium tracking-[0.1em] text-[#4e6880]"
        >
          メールアドレス
        </label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            // peer: このinputのフォーカス状態を、DOM上で後ろにあるアイコンから
            // peer-focus: で参照するための目印
            className="peer w-full rounded border border-[rgba(74,98,120,0.25)] bg-[#f0f4f8] py-2.5 pr-3 pl-[34px] font-mono text-sm tracking-[0.03em] text-[#1a2e42] outline-none transition-colors placeholder:text-[#b0c8dc] focus:border-amber-500/45 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
          />
          {/* アイコンは絶対配置で左側に重ねているだけなので、DOM順としては
              input の後ろに置くことで peer-focus のセレクタ（後続の要素にしか効かない）を使える */}
          <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9ab4cc] transition-colors peer-focus:text-amber-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 6.5A2.75 2.75 0 1 0 7 1a2.75 2.75 0 0 0 0 5.5Zm-4.5 6a4.5 4.5 0 0 1 9 0"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* パスワード */}
      <div className="mb-6">
        <label
          htmlFor="password"
          className="mb-[7px] block text-[11px] font-medium tracking-[0.1em] text-[#4e6880]"
        >
          パスワード
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            className="peer w-full rounded border border-[rgba(74,98,120,0.25)] bg-[#f0f4f8] py-2.5 pr-10 pl-[34px] text-sm text-[#1a2e42] outline-none transition-colors placeholder:text-[#b0c8dc] focus:border-amber-500/45 focus:shadow-[0_0_0_3px_rgba(245,158,11,0.07)]"
          />
          <div className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#9ab4cc] transition-colors peer-focus:text-amber-600">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect
                x="2"
                y="6"
                width="10"
                height="7"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M4.5 6V4.5a2.5 2.5 0 0 1 5 0V6"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <circle cx="7" cy="9.5" r="0.9" fill="currentColor" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword ? 'パスワードを隠す' : 'パスワードを表示する'
            }
            className="absolute top-1/2 right-3 -translate-y-1/2 text-[#9ab4cc] transition-colors hover:text-[#4e6880]"
          >
            {showPassword ? (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path
                  d="M1.5 7.5s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
                <line
                  x1="2.5"
                  y1="12.5"
                  x2="12.5"
                  y2="2.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path
                  d="M1.5 7.5s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5Z"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
                <circle cx="7.5" cy="7.5" r="1.8" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* エラー */}
      {state?.error && (
        <div className="mb-5 flex items-start gap-2 rounded border border-red-500/20 bg-red-500/[0.07] p-3">
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            className="mt-px shrink-0"
          >
            <circle cx="6.5" cy="6.5" r="5.5" stroke="#ef4444" strokeWidth="1.1" />
            <line
              x1="6.5"
              y1="3.5"
              x2="6.5"
              y2="7"
              stroke="#ef4444"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <circle cx="6.5" cy="9" r="0.7" fill="#ef4444" />
          </svg>
          <span className="text-xs text-red-400">{state.error}</span>
        </div>
      )}

      {/* 送信 */}
      <button
        type="submit"
        disabled={pending}
        className={`flex w-full items-center justify-center gap-2 rounded py-[11px] text-sm font-semibold tracking-[0.06em] text-[#080f18] transition-opacity ${
          pending
            ? 'cursor-not-allowed bg-amber-500/45'
            : 'cursor-pointer bg-gradient-to-br from-amber-500 to-amber-600 hover:opacity-90 active:scale-[0.99]'
        }`}
      >
        {pending ? (
          <>
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              className="animate-spin"
            >
              <circle cx="6.5" cy="6.5" r="5" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
              <path
                d="M6.5 1.5A5 5 0 0 1 11.5 6.5"
                stroke="#080f18"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            認証中…
          </>
        ) : (
          'ログイン'
        )}
      </button>
    </form>
  )
}
