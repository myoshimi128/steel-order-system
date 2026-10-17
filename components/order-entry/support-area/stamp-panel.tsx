'use client'

// 補助エリアの「スタンプ」の枠。チェックしたスタンプが現場用伝票に印字される。
//
//   ・番号の欄に番号を打って Enter で付け外しする（欄は空に戻り、カーソルはそのまま）。
//     欄が空のまま Enter を押すと、フリーコメントへ進む。クリックでも付け外しできる
//   ・得意先の指定スタンプは、得意先を選んだ時点でチェックが入り「客先指定」の印が付く（外すこともできる）
//   ・スプライス専用の受注でショットが有のときは、先頭に「ショット加工」を「自動」の印付きで出す。
//     手では外せず、保存もしない（現場用伝票には orders.splice_shot から印字する）
// 状態とキー操作の判定は use-order-aux.ts に分け、この部品は表示だけを担当する。

import { NumericField } from '@/components/code-input/numeric-field'
import type { NavigationFieldProps } from '@/components/order-entry/items/dimension-props'
import type { OrderAuxState } from '@/lib/order-entry/use-order-aux'
import { AuxPanel } from './aux-panel'

type StampPanelProps = {
  aux: OrderAuxState
  // スプライス専用の受注でショットが有か（「ショット加工」を自動で出す）
  showShotStamp: boolean
  // 番号の欄の入力順の管理用の props
  fieldProps: NavigationFieldProps
}

// 印（「自動」「客先指定」）
function Badge({ text, strong = false }: { text: string; strong?: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        strong
          ? 'bg-blue-600 text-white'
          : 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
      }`}
    >
      {text}
    </span>
  )
}

export function StampPanel({ aux, showShotStamp, fieldProps }: StampPanelProps) {
  // 番号の欄の Enter: 番号があれば付け外しして欄に留まり、空なら次の欄（フリーコメント）へ進む
  function handleNext() {
    if (aux.enterStampCode() === 'empty') {
      fieldProps.onNext()
    }
  }

  return (
    <AuxPanel title="スタンプ" note="番号 → Enter で付け外し">
      <div className="mb-2">
        <NumericField
          {...fieldProps}
          label="番号"
          value={aux.stampCode}
          onValueChange={aux.setStampCode}
          onNext={handleNext}
          error={aux.stampCodeError}
          widthClass="w-14"
        />
      </div>

      <ul className="flex flex-col gap-1">
        {showShotStamp && (
          <li className="flex items-center gap-2 text-sm">
            <span className="w-5" />
            {/* 手では外せないため、チェック済みで変更不可にする */}
            <input type="checkbox" checked disabled readOnly aria-label="ショット加工" />
            <span className="font-semibold">ショット加工</span>
            <Badge text="自動" strong />
          </li>
        )}
        {aux.states.map(({ stamp, checked, designated }) => (
          <li key={stamp.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <span className="w-5 text-right text-xs tabular-nums text-neutral-500 dark:text-neutral-400">
                {stamp.number}
              </span>
              {/* テンキーでは番号の欄から付け外しするため、Tab での移動の対象にはしない */}
              <input
                type="checkbox"
                tabIndex={-1}
                checked={checked}
                onChange={() => aux.toggle(stamp.id)}
              />
              <span>{stamp.body}</span>
              {designated && <Badge text="客先指定" />}
            </label>
          </li>
        ))}
        {aux.states.length === 0 && !showShotStamp && (
          <li className="text-xs text-neutral-400 dark:text-neutral-500">
            スタンプが登録されていません
          </li>
        )}
      </ul>
    </AuxPanel>
  )
}
