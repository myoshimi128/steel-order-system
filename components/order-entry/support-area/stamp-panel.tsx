'use client'

// ② 注文内容の下の帯の「スタンプ」の枠。チェックしたスタンプが現場用伝票に印字される。
//
//   ・番号の欄に番号を打って Enter で付け外しする（欄は空に戻り、カーソルはそのまま）。
//     欄が空のまま Enter を押すと、フリーコメントへ進む。クリックでも付け外しできる
//   ・得意先の指定スタンプは、得意先を選んだ時点でチェックが入り「客先指定」の印が付く（外すこともできる）
//   ・スプライス専用の受注でショットが有のときは、先頭に「ショット加工」を「自動」の印付きで出す。
//     手では外せず、保存もしない（現場用伝票には orders.splice_shot から印字する）
// 状態とキー操作の判定は use-order-aux.ts に分け、この部品は表示だけを担当する。

import { NumericField } from '@/components/code-input/numeric-field'
import type { NavigationFieldProps } from '@/components/order-entry/items/dimension-props'
import { CODE_LENGTHS } from '@/lib/code-lengths'
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
    <AuxPanel
      title="スタンプ"
      note="番号 → Enter で付け外し"
      headerContent={
        // 帯の高さを抑えるため、番号の欄は見出しの行に置く。
        // 番号は 2 桁まで（lib/code-lengths.ts）。Enter で付け外しする欄のため、桁がそろっても自動では進まない
        <NumericField
          {...fieldProps}
          value={aux.stampCode}
          onValueChange={(value) => aux.setStampCode(value.slice(0, CODE_LENGTHS.stamp))}
          onNext={handleNext}
          error={aux.stampCodeError}
          placeholder="番号"
          widthClass="w-14"
          dense
          showErrorText={false}
        />
      }
    >
      {aux.stampCodeError && <p className="mb-1 text-xs text-red-600">{aux.stampCodeError}</p>}
      {/* 帯の高さに多く収まるよう、3 列に並べる */}
      <ul className="grid grid-cols-3 gap-x-3 gap-y-0.5">
        {showShotStamp && (
          <li className="flex items-center gap-2 text-[13px]">
            <span className="w-5" />
            {/* 手では外せないため、チェック済みで変更不可にする */}
            <input type="checkbox" checked disabled readOnly aria-label="ショット加工" />
            <span className="font-semibold">ショット加工</span>
            <Badge text="自動" strong />
          </li>
        )}
        {aux.states.map(({ stamp, checked, designated }) => (
          <li key={stamp.id}>
            <label className="flex min-w-0 cursor-pointer items-center gap-1.5 text-[13px]">
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
              {/* 列の幅に収まらない文言は省略し、マウスを乗せると全体を出す */}
              <span title={stamp.body} className="truncate">
                {stamp.body}
              </span>
              {designated && <Badge text="客先指定" />}
            </label>
          </li>
        ))}
        {aux.states.length === 0 && !showShotStamp && (
          <li className="col-span-3 text-xs text-neutral-400 dark:text-neutral-500">
            スタンプが登録されていません
          </li>
        )}
      </ul>
    </AuxPanel>
  )
}
