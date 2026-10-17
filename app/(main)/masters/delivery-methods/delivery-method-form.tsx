'use client'

// 新規登録・編集の両方で使う入力フォーム。plate-type-form.tsx と同じ構造。

import { useActionState } from 'react'
import { NumberField } from '@/components/masters/number-field'
import {
  createDeliveryMethod,
  updateDeliveryMethod,
  type DeliveryMethodFormState,
} from './actions'

type DeliveryMethod = {
  id: string
  number: number
  name: string
  requires_note: boolean
  is_active: boolean
}

type DeliveryMethodFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; deliveryMethod: DeliveryMethod }

export function DeliveryMethodForm(props: DeliveryMethodFormProps) {
  const action =
    props.mode === 'create'
      ? createDeliveryMethod
      : updateDeliveryMethod.bind(null, props.deliveryMethod.id)

  const [state, formAction, pending] = useActionState<
    DeliveryMethodFormState,
    FormData
  >(action, undefined)

  const deliveryMethod = props.mode === 'edit' ? props.deliveryMethod : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <NumberField defaultValue={deliveryMethod?.number} />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          配達方法名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={deliveryMethod?.name}
          placeholder="宵積み、2便、置場引取 など"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {/* フリーのように、選んだときに受注登録画面で文字を入力させる配達方法か */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="requires_note"
          defaultChecked={deliveryMethod?.requires_note}
        />
        選んだときに文字を入力する（フリー）
      </label>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={deliveryMethod?.is_active}
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
