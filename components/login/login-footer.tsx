// ログイン画面の下端の帯。左に著作権の表示、右に問い合わせ先を置く。

export function LoginFooter() {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-between border-t border-line bg-white px-5 text-xs text-neutral-500">
      <span className="font-mono tracking-[0.1em]">© 2026 STEEL ORDER SYSTEM</span>
      <span>お問い合わせ：システム管理者</span>
    </footer>
  )
}
