'use client'

// 加工の注意事項の新規登録・編集で使う入力フォーム。
// 加工種別は必須。板厚・穴径の範囲は任意（どちらも「以上・以下」で、片方だけの指定もできる）。
//   例: キリ孔・穴径 30 以上 →「精度注意」
//       曲げ・板厚 13 以上   →「12mm を超える曲げは要確認」
// 穴径の範囲は、入力の形が「穴」の加工種別を選んだときだけ入力できる。

import { useActionState, useState } from 'react'
import {
  createProcessNotice,
  updateProcessNotice,
  type ProcessNoticeFormState,
} from './actions'

type ProcessNotice = {
  id: string
  process_type_id: string
  thickness_min: number | null
  thickness_max: number | null
  hole_diameter_min: number | null
  hole_diameter_max: number | null
  body: string
  is_active: boolean
}

// 選択肢（page.tsx でサーバーから取得して渡す）
type ProcessTypeOption = { id: string; number: number | null; name: string; input_shape: string }

type ProcessNoticeFormProps = {
  processTypes: ProcessTypeOption[]
} & ({ mode: 'create' } | { mode: 'edit'; processNotice: ProcessNotice })

const INPUT_CLASS =
  'rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900'

// 範囲（下限・上限）の入力欄
function RangeFields({
  label,
  unit,
  names,
  defaults,
  disabled = false,
}: {
  label: string
  unit: string
  names: { min: string; max: string }
  defaults: { min: number | null; max: number | null }
  disabled?: boolean
}) {
  return (
    <fieldset className="flex flex-col gap-1" disabled={disabled}>
      <legend className="text-sm">{label}（任意）</legend>
      <div className="flex items-center gap-2 text-sm">
        <input
          name={names.min}
          type="text"
          inputMode="decimal"
          aria-label={`${label}の下限`}
          defaultValue={defaults.min ?? ''}
          className={`w-24 ${INPUT_CLASS} disabled:opacity-50`}
        />
        <span>{unit} 以上</span>
        <input
          name={names.max}
          type="text"
          inputMode="decimal"
          aria-label={`${label}の上限`}
          defaultValue={defaults.max ?? ''}
          className={`w-24 ${INPUT_CLASS} disabled:opacity-50`}
        />
        <span>{unit} 以下</span>
      </div>
    </fieldset>
  )
}

export function ProcessNoticeForm(props: ProcessNoticeFormProps) {
  const action =
    props.mode === 'create'
      ? createProcessNotice
      : updateProcessNotice.bind(null, props.processNotice.id)

  const [state, formAction, pending] = useActionState<ProcessNoticeFormState, FormData>(
    action,
    undefined
  )

  const notice = props.mode === 'edit' ? props.processNotice : null
  // 選んだ加工種別（穴径の範囲を入力できるかの判定に使う）
  const [processTypeId, setProcessTypeId] = useState(notice?.process_type_id ?? '')
  const isHoleShape =
    props.processTypes.find((type) => type.id === processTypeId)?.input_shape === '穴'

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="process_type_id" className="text-sm">
          加工種別
        </label>
        <select
          id="process_type_id"
          name="process_type_id"
          required
          value={processTypeId}
          onChange={(event) => setProcessTypeId(event.target.value)}
          className={INPUT_CLASS}
        >
          <option value="" disabled>
            選択してください
          </option>
          {props.processTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.number ?? '—'} {type.name}
            </option>
          ))}
        </select>
      </div>

      <RangeFields
        label="板厚"
        unit="mm"
        names={{ min: 'thickness_min', max: 'thickness_max' }}
        defaults={{ min: notice?.thickness_min ?? null, max: notice?.thickness_max ?? null }}
      />
      <p className="-mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        加工の行の母材（材料の行）の板厚で判定します
      </p>

      {/* 無効にした fieldset の中の欄は送信されないため、穴の形でなければ穴径の範囲は空として扱われる */}
      <RangeFields
        label="穴径"
        unit="φ"
        names={{ min: 'hole_diameter_min', max: 'hole_diameter_max' }}
        defaults={{
          min: notice?.hole_diameter_min ?? null,
          max: notice?.hole_diameter_max ?? null,
        }}
        disabled={!isHoleShape}
      />
      <p className="-mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        入力の形が「穴」の加工種別（レーザー・プラズマ孔・ガス孔・キリ孔など）のときだけ指定できます
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="body" className="text-sm">
          文言
        </label>
        <input
          id="body"
          name="body"
          type="text"
          required
          defaultValue={notice?.body}
          placeholder="精度注意、12mm を超える曲げは要確認 など"
          className={INPUT_CLASS}
        />
      </div>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={notice?.is_active} />
          有効
        </label>
      )}

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? '保存中…' : '保存'}
      </button>
    </form>
  )
}
