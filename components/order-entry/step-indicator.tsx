// 受注登録の上部に出す進み具合（① 受注情報 → ② 注文内容 → ③ 伝票の指示）。
// 済んだ画面には ✓、今の画面はネイビーの丸で示す（受付〜受注登録の画面イメージに合わせる）。
// 受付の機能ができたら、先頭に「受注登録待ち」を加える。

import { ORDER_ENTRY_STEPS, type OrderEntryStep } from '@/lib/order-entry/order-entry-steps'

export function StepIndicator({ current }: { current: OrderEntryStep }) {
  const currentIndex = ORDER_ENTRY_STEPS.findIndex((item) => item.step === current)

  return (
    <ol className="flex items-center gap-2 text-sm">
      {ORDER_ENTRY_STEPS.map((item, index) => {
        const done = index < currentIndex
        const active = index === currentIndex
        return (
          <li key={item.step} className="flex items-center gap-2">
            {index > 0 && <span className="h-px w-8 bg-line" aria-hidden="true" />}
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? 'bg-navy text-white'
                  : done
                    ? 'border border-navy text-navy'
                    : 'border border-line text-neutral-400'
              }`}
            >
              {done ? '✓' : index + 1}
            </span>
            <span
              aria-current={active ? 'step' : undefined}
              className={active ? 'font-semibold text-navy' : done ? 'text-navy' : 'text-neutral-400'}
            >
              {item.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
