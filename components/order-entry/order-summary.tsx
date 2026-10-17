// ② 注文内容・③ 伝票の指示の上部に固定表示する、受注情報の要約（受注No.・部材区分・売り先・納期・入れ先）。
// 明細が多くても得意先や納期を見失わないようにする。「受注情報に戻る」で ① に戻れる（入力した明細は消さない）。

export type OrderSummaryItem = { label: string; value: string }

type OrderSummaryProps = {
  items: readonly OrderSummaryItem[]
  onBackToInfo: () => void
}

export function OrderSummary({ items, onBackToInfo }: OrderSummaryProps) {
  return (
    <div className="flex items-center gap-5 border-b border-line bg-navy-soft px-4 py-2">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col">
          <span className="text-[11px] text-neutral-500">{item.label}</span>
          <span className="truncate text-sm font-semibold text-navy">{item.value || '—'}</span>
        </div>
      ))}
      <button
        type="button"
        // マウスで戻る。テンキーの入力の流れには含めない（Shift+Enter でも前の画面の欄へは戻らないため、ボタンで戻る）
        tabIndex={-1}
        onClick={onBackToInfo}
        className="ml-auto shrink-0 rounded px-2 py-1 text-xs text-navy hover:bg-white"
      >
        ← 受注情報に戻る
      </button>
    </div>
  )
}
