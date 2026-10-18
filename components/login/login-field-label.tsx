// ログインのカードの入力欄の項目名。必須の印（赤い＊）を付ける。
// 赤は必須の印とエラーにだけ使う（docs/screen-design.md「色」）。

export function LoginFieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-neutral-800">
      {children}
      {/* 読み上げでは「必須」と読ませ、見た目の＊は読ませない */}
      <span className="ml-0.5 text-urgent" aria-hidden="true">
        *
      </span>
      <span className="sr-only">（必須）</span>
    </label>
  )
}
