'use client'

// 新規登録・編集の両方で使う入力フォーム。customer-form.tsx と同じ構造。

import { useActionState } from 'react'
import {
  createManufacturer,
  updateManufacturer,
  type ManufacturerFormState,
} from './actions'

type Manufacturer = {
  id: string
  code: string
  name: string
  is_active: boolean
}

type ManufacturerFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; manufacturer: Manufacturer }

export function ManufacturerForm(props: ManufacturerFormProps) {
  const action =
    props.mode === 'create'
      ? createManufacturer
      : updateManufacturer.bind(null, props.manufacturer.id)

  const [state, formAction, pending] = useActionState<
    ManufacturerFormState,
    FormData
  >(action, undefined)

  const manufacturer = props.mode === 'edit' ? props.manufacturer : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="text-sm">
          メーカーコード
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={manufacturer?.code}
          placeholder="220"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          メーカー名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={manufacturer?.name}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={manufacturer?.is_active}
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
