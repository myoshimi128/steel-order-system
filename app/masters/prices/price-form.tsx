'use client'

// 新規登録・編集の両方で使う入力フォーム。
// material_id は select で選ぶため、一覧ページ側で materials マスタを取得して渡してもらう。
// prices には is_active 列がない（価格改定は新しい行を追加して履歴として残す設計のため）。

import { useActionState } from 'react'
import { createPrice, updatePrice, type PriceFormState } from './actions'

type MaterialOption = { id: string; name: string }

type Price = {
  id: string
  material_id: string
  thickness: number
  shape: '定尺' | '大板'
  cutting_method: 'シャーリング' | 'ガス' | 'レーザー' | 'プラズマ' | '定尺売り'
  weight_class: '2kg以下' | '2kg超'
  unit_price: number
  valid_from: string
}

type PriceFormProps =
  | { mode: 'create'; materials: MaterialOption[] }
  | { mode: 'edit'; materials: MaterialOption[]; price: Price }

export function PriceForm(props: PriceFormProps) {
  const action =
    props.mode === 'create'
      ? createPrice
      : updatePrice.bind(null, props.price.id)

  const [state, formAction, pending] = useActionState<
    PriceFormState,
    FormData
  >(action, undefined)

  const price = props.mode === 'edit' ? props.price : null

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
          defaultValue={price?.material_id ?? ''}
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
          defaultValue={price?.thickness}
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
          defaultValue={price?.shape ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          <option value="定尺">定尺</option>
          <option value="大板">大板</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cutting_method" className="text-sm">
          切断方法
        </label>
        <select
          id="cutting_method"
          name="cutting_method"
          required
          defaultValue={price?.cutting_method ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          <option value="シャーリング">シャーリング</option>
          <option value="ガス">ガス</option>
          <option value="レーザー">レーザー</option>
          <option value="プラズマ">プラズマ</option>
          <option value="定尺売り">定尺売り</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="weight_class" className="text-sm">
          重量区分
        </label>
        <select
          id="weight_class"
          name="weight_class"
          required
          defaultValue={price?.weight_class ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          <option value="2kg以下">2kg以下</option>
          <option value="2kg超">2kg超</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="unit_price" className="text-sm">
          単価
        </label>
        <input
          id="unit_price"
          name="unit_price"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={price?.unit_price}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="valid_from" className="text-sm">
          適用開始日
        </label>
        <input
          id="valid_from"
          name="valid_from"
          type="date"
          required
          defaultValue={price?.valid_from}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

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
