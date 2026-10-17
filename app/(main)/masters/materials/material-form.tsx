'use client'

// 新規登録・編集の両方で使う入力フォーム。customer-form.tsx と同じ構造。

import { useActionState } from 'react'
import { NumberField } from '@/components/masters/number-field'
import { createMaterial, updateMaterial, type MaterialFormState } from './actions'

type Material = {
  id: string
  number: number
  name: string
  line_mark: string | null
  display_color: string | null
  default_steel_making: '電炉材' | '高炉材'
  has_dedicated_price: boolean
  is_active: boolean
}

type MaterialFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; material: Material }

export function MaterialForm(props: MaterialFormProps) {
  const action =
    props.mode === 'create'
      ? createMaterial
      : updateMaterial.bind(null, props.material.id)

  const [state, formAction, pending] = useActionState<
    MaterialFormState,
    FormData
  >(action, undefined)

  const material = props.mode === 'edit' ? props.material : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <NumberField defaultValue={material?.number} />

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          材質名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={material?.name}
          placeholder="SS400"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="line_mark" className="text-sm">
          材質ラインの指示
        </label>
        <input
          id="line_mark"
          name="line_mark"
          type="text"
          defaultValue={material?.line_mark ?? ''}
          placeholder="青2本（基本材質は空欄）"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="display_color" className="text-sm">
          現場用伝票での表示色
        </label>
        <input
          id="display_color"
          name="display_color"
          type="text"
          defaultValue={material?.display_color ?? ''}
          placeholder="基本材質は空欄"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {/* 受注明細でこの材質を選んだときに、製鋼法の欄へ入れる初期値（明細で変更できる） */}
      <div className="flex flex-col gap-1">
        <label htmlFor="default_steel_making" className="text-sm">
          製鋼法の初期値
        </label>
        <select
          id="default_steel_making"
          name="default_steel_making"
          required
          defaultValue={material?.default_steel_making ?? '電炉材'}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="電炉材">電炉</option>
          <option value="高炉材">高炉</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="has_dedicated_price"
          defaultChecked={material?.has_dedicated_price}
        />
        専用単価を持つ（切断単価マスタで材質を指定した行を使う）
      </label>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={material?.is_active}
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
