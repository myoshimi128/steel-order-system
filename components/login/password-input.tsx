'use client'

// パスワードの入力欄。右端の目のアイコンで、打った文字の表示・非表示を切り替える。
// 入力値そのものは持たず（フォームの送信は FormData で行う）、表示するかどうかだけを持つ。

import { useState } from 'react'

type PasswordInputProps = {
  id: string
  name: string
  className: string
}

export function PasswordInput({ id, name, className }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        required
        autoComplete="current-password"
        placeholder="パスワードを入力"
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'パスワードを隠す' : 'パスワードを表示する'}
        // Tab での移動はパスワード → ログインのボタンの順にしたいため、このボタンは飛ばす
        tabIndex={-1}
        className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-500 hover:text-navy"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M1.5 9s2.8-5.5 7.5-5.5S16.5 9 16.5 9s-2.8 5.5-7.5 5.5S1.5 9 1.5 9Z"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.3" />
          {/* 表示中は斜線を引いて「隠す」を表す */}
          {visible && (
            <line x1="3" y1="15" x2="15" y2="3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </div>
  )
}
