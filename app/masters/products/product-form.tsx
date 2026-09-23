'use client'

// 新規登録・編集の両方で使う入力フォーム。
// material_id は select で選ぶため、一覧ページ側で materials マスタを取得して渡してもらう。

import { useActionState } from 'react'
import { createProduct, updateProduct, type ProductFormState } from './actions'

type MaterialOption = { id: string; name: string }

type Product = {
  id: string
  material_id: string
  thickness: number
  shape: '定尺' | '大板'
  is_active: boolean
}

type ProductFormProps =
  | { mode: 'create'; materials: MaterialOption[] }
  | { mode: 'edit'; materials: MaterialOption[]; product: Product }

export function ProductForm(props: ProductFormProps) {
  const action =
    props.mode === 'create'
      ? createProduct
      : updateProduct.bind(null, props.product.id)

  const [state, formAction, pending] = useActionState<
    ProductFormState,
    FormData
  >(action, undefined)

  const product = props.mode === 'edit' ? props.product : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="material_id" className="text-sm">
          材質
        </label>
        <select
          id="material_id"
          name="material_id"
          required
          defaultValue={product?.material_id ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          {props.materials.map((material) => (
            <option key={material.id} value={material.id}>
              {material.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="thickness" className="text-sm">
          板厚（mm）
        </label>
        <input
          id="thickness"
          name="thickness"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={product?.thickness}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="shape" className="text-sm">
          形状
        </label>
        <select
          id="shape"
          name="shape"
          required
          defaultValue={product?.shape ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          <option value="定尺">定尺</option>
          <option value="大板">大板</option>
        </select>
      </div>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={product?.is_active}
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
