'use client'

// 新規登録・編集の両方で使う入力フォーム。
// thickness_extras は種類・材質の列を持たないため、products に登録されている
// 板厚の一覧（重複なし）から選ぶだけの単純な select にしている（自由入力にしない）。

import { useActionState } from 'react'
import {
  createThicknessExtra,
  updateThicknessExtra,
  type ThicknessExtraFormState,
} from './actions'

type ThicknessExtra = {
  id: string
  thickness: number
  extra_price: number
}

type ThicknessExtraFormProps = {
  thicknessOptions: number[]
} & ({ mode: 'create' } | { mode: 'edit'; thicknessExtra: ThicknessExtra })

export function ThicknessExtraForm(props: ThicknessExtraFormProps) {
  const action =
    props.mode === 'create'
      ? createThicknessExtra
      : updateThicknessExtra.bind(null, props.thicknessExtra.id)

  const [state, formAction, pending] = useActionState<
    ThicknessExtraFormState,
    FormData
  >(action, undefined)

  const thicknessExtra = props.mode === 'edit' ? props.thicknessExtra : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="thickness" className="text-sm">
          板厚（mm）
        </label>
        <select
          id="thickness"
          name="thickness"
          required
          defaultValue={thicknessExtra?.thickness ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          {props.thicknessOptions.map((thickness) => (
            <option key={thickness} value={thickness}>
              {thickness}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="extra_price" className="text-sm">
          加算値
        </label>
        <input
          id="extra_price"
          name="extra_price"
          type="number"
          step="any"
          required
          defaultValue={thicknessExtra?.extra_price}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
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
