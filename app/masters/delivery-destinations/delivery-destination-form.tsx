'use client'

// 新規登録・編集の両方で使う入力フォーム。customer-form.tsx と同じ構造。

import { useActionState } from 'react'
import {
  createDeliveryDestination,
  updateDeliveryDestination,
  type DeliveryDestinationFormState,
} from './actions'

type DeliveryDestination = {
  id: string
  code: string
  name: string
  address: string | null
  area: string | null
  is_active: boolean
}

type DeliveryDestinationFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; destination: DeliveryDestination }

export function DeliveryDestinationForm(props: DeliveryDestinationFormProps) {
  const action =
    props.mode === 'create'
      ? createDeliveryDestination
      : updateDeliveryDestination.bind(null, props.destination.id)

  const [state, formAction, pending] = useActionState<
    DeliveryDestinationFormState,
    FormData
  >(action, undefined)

  const destination = props.mode === 'edit' ? props.destination : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="text-sm">
          納入先コード
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={destination?.code}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          納入先名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={destination?.name}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm">
          住所
        </label>
        <input
          id="address"
          name="address"
          type="text"
          defaultValue={destination?.address ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="area" className="text-sm">
          持込地区
        </label>
        <input
          id="area"
          name="area"
          type="text"
          defaultValue={destination?.area ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={destination?.is_active}
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
