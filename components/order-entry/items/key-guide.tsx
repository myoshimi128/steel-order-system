// 画面下部に常に表示するキー操作の案内（docs/screen-design.md「キー操作」）。

// joiner はキーの間に入れる記号。
//   '+' … 同時に押す（Ctrl + Del）／続けて押す（行番号 → *）
//   '/' … どちらか（↑ / ↓）
// 複写・削除は、材料の行にぶら下がる加工の行もまとめて扱う（docs/screen-design.md「行の操作」）
const KEYS: { keys: string[]; joiner?: '+' | '/'; label: string }[] = [
  { keys: ['Enter'], label: '次の項目' },
  { keys: ['Shift', 'Enter'], joiner: '+', label: '前の項目' },
  { keys: ['↑', '↓'], joiner: '/', label: '前・次の項目' },
  { keys: ['/'], label: '選択肢の一覧' },
  { keys: ['*'], label: '直前の材料の行を加工ごと複写' },
  // 空の行の切断方法の欄で行番号を打ってから「*」
  { keys: ['行番号', '*'], joiner: '+', label: 'その番号の材料の行を加工ごと複写' },
  { keys: ['-'], label: '摘要へ' },
  { keys: ['+'], label: '加工の行を追加' },
  { keys: ['Ctrl', 'Del'], joiner: '+', label: '行を削除（材料の行は加工ごと）' },
  { keys: ['Ctrl', 'Ins'], joiner: '+', label: '行を挿入' },
]

export function KeyGuide() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-2 text-xs text-neutral-500 dark:text-neutral-400">
      {KEYS.map((item) => (
        <span key={item.label} className="flex items-center gap-1">
          {item.keys.map((key, index) => (
            <span key={key} className="flex items-center gap-1">
              {index > 0 && (item.joiner ?? '+')}
              <kbd className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 font-sans font-semibold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                {key}
              </kbd>
            </span>
          ))}
          {item.label}
        </span>
      ))}
      <span className="ml-auto">グレーの欄は自動計算</span>
    </div>
  )
}
