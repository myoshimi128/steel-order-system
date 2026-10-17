'use client'

// 新規登録・編集の両方で使う入力フォーム。delivery-method-form.tsx と同じ構造。

import { useActionState } from 'react'
import { NumberField } from '@/components/masters/number-field'
import { createStamp, updateStamp, type StampFormState } from './actions'

type Stamp = {
  id: string
  number: number
  body: string
  is_active: boolean
}

type StampFormProps = { mode: 'create' } | { mode: 'edit'; stamp: Stamp }

export function StampForm(props: StampFormProps) {
  const action =
    props.mode === 'create' ? createStamp : updateStamp.bind(null, props.stamp.id)

  const [state, formAction, pending] = useActionState<StampFormState, FormData>(
    action,
    undefined
  )

  const stamp = props.mode === 'edit' ? props.stamp : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <NumberField
        defaultValue={stamp?.number}
        note="受注登録画面で番号を打ってスタンプを付け外しする。並び順にも使う（1 以上）"
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="body" className="text-sm">
          文言
        </label>
        <input
          id="body"
          name="body"
          type="text"
          required
          defaultValue={stamp?.body}
          placeholder="雨濡れ厳禁、急ぎ など"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={stamp?.is_active} />
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
