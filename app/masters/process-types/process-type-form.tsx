'use client'

// 新規登録・編集の両方で使う入力フォーム。customer-form.tsx と同じ構造。

import { useActionState } from 'react'
import {
  createProcessType,
  updateProcessType,
  type ProcessTypeFormState,
} from './actions'

type ProcessType = {
  id: string
  name: string
  category: string | null
  is_active: boolean
}

type ProcessTypeFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; processType: ProcessType }

export function ProcessTypeForm(props: ProcessTypeFormProps) {
  const action =
    props.mode === 'create'
      ? createProcessType
      : updateProcessType.bind(null, props.processType.id)

  const [state, formAction, pending] = useActionState<
    ProcessTypeFormState,
    FormData
  >(action, undefined)

  const processType = props.mode === 'edit' ? props.processType : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          加工名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={processType?.name}
          placeholder="穴あけ、キリ孔、曲げ など"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="category" className="text-sm">
          集計用の区分
        </label>
        <input
          id="category"
          name="category"
          type="text"
          defaultValue={processType?.category ?? ''}
          placeholder="アイトレ、SPL など"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={processType?.is_active}
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
