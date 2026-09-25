'use client'

// 新規登録・編集の両方で使う入力フォーム。
// plate_type_id・material_id は select で選ぶため、一覧ページ側で
// plate_types・materials マスタを取得して渡してもらう。

import { useActionState } from 'react'
import { createProduct, updateProduct, type ProductFormState } from './actions'

type PlateTypeOption = { id: string; name: string }
type MaterialOption = { id: string; name: string }

type Product = {
  id: string
  plate_type_id: string
  // 無規格（ボンデ・ミガキ）は材質を持たないため null になりうる
  material_id: string | null
  thickness: number
  shape: '定尺' | '大板'
  is_active: boolean
}

type ProductFormProps =
  | { mode: 'create'; plateTypes: PlateTypeOption[]; materials: MaterialOption[] }
  | {
      mode: 'edit'
      plateTypes: PlateTypeOption[]
      materials: MaterialOption[]
      product: Product
    }

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
        <label htmlFor="plate_type_id" className="text-sm">
          種類
        </label>
        <select
          id="plate_type_id"
          name="plate_type_id"
          required
          defaultValue={product?.plate_type_id ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          {props.plateTypes.map((plateType) => (
            <option key={plateType.id} value={plateType.id}>
              {plateType.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="material_id" className="text-sm">
          材質
        </label>
        <select
          id="material_id"
          name="material_id"
          defaultValue={product?.material_id ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {/* ボンデ・ミガキなど無規格の商品は材質を持たないため、空欄（NULL）を選べるようにする */}
          <option value="">（材質なし）</option>
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
