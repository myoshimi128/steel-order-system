'use client'

// 新規登録・編集の両方で使う入力フォーム。

import { useActionState } from 'react'
import {
  createPlateType,
  updatePlateType,
  type PlateTypeFormState,
} from './actions'

type PlateType = {
  id: string
  name: string
  applies_material_extra: boolean
  is_active: boolean
}

type PlateTypeFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; plateType: PlateType }

export function PlateTypeForm(props: PlateTypeFormProps) {
  const action =
    props.mode === 'create'
      ? createPlateType
      : updatePlateType.bind(null, props.plateType.id)

  const [state, formAction, pending] = useActionState<
    PlateTypeFormState,
    FormData
  >(action, undefined)

  const plateType = props.mode === 'edit' ? props.plateType : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          種類名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={plateType?.name}
          placeholder="普通板、縞板、ボンデ、ミガキ など"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="applies_material_extra"
          defaultChecked={plateType?.applies_material_extra}
        />
        材質エキストラを適用する
      </label>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={plateType?.is_active}
          />
          有効
        </label>
      )}

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
