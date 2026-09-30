// 入力しない欄の表示（「—」）。
// 材質を持たない種類（ボンデ・ミガキ）の材質や、定尺売り・縞板の製鋼法など。

export function NotApplicable() {
  return (
    <span className="flex h-[34px] items-center justify-center rounded border border-dashed border-neutral-200 text-neutral-400 dark:border-neutral-800">
      —
    </span>
  )
}
