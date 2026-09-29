// マスタ管理画面の「番号」入力欄（種類・材質・特殊製品種別・加工種別・配達方法で共通）。
// 受注登録画面ではこの番号をテンキーで入力してマスタを選ぶ。
//
// type="number" ではなく type="text" + inputMode="numeric" にしているのは、
// type="number" だとマウスホイールで値が変わったり、「e」などの文字が入力できてしまうため。
// 数字だけかどうかの最終的な検証は Server Action（lib/master-number.ts）と DB の制約で行う。

type NumberFieldProps = {
  // 編集時の現在の番号。新規登録時や未設定の場合は null
  defaultValue?: number | null
  // 入力欄の下に出す補足（使えない番号の説明など）
  note?: string
}

export function NumberField({ defaultValue, note }: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="number" className="text-sm">
        番号
      </label>
      <input
        id="number"
        name="number"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        required
        defaultValue={defaultValue ?? ''}
        placeholder="受注登録画面で入力する番号"
        className="w-32 rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
      />
      {note && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{note}</p>
      )}
    </div>
  )
}
