'use client'

// 新規登録・編集の両方で使う入力フォーム。customer-form.tsx と同じ構造。

import { useActionState } from 'react'
import { NumberField } from '@/components/masters/number-field'
import {
  DEFAULT_PROCESS_INPUT_SHAPE,
  PROCESS_INPUT_SHAPES,
} from '@/lib/order-entry/constants'
import {
  createProcessType,
  updateProcessType,
  type ProcessTypeFormState,
} from './actions'

type ProcessType = {
  id: string
  // 番号のない既存行があるため NULL を許す（編集時に入力してもらう）
  number: number | null
  name: string
  category: string | null
  // 入力の形（DB 上は text 列。CHECK 制約で入力の形の値に限定されている）
  input_shape: string
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
      <NumberField defaultValue={processType?.number} />

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

      <div className="flex flex-col gap-1">
        <label htmlFor="input_shape" className="text-sm">
          入力の形
        </label>
        {/* 受注登録画面の加工の行で、加工の項目の入力欄と数量の求め方を切り替える */}
        <select
          id="input_shape"
          name="input_shape"
          required
          defaultValue={processType?.input_shape ?? DEFAULT_PROCESS_INPUT_SHAPE}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {PROCESS_INPUT_SHAPES.map((shape) => (
            <option key={shape.value} value={shape.value}>
              {shape.label}
            </option>
          ))}
        </select>
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
