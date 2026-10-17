'use client'

// 新規登録・編集の両方で使う入力フォーム。
// material_id は select で選ぶため、一覧ページ側で materials マスタを取得して渡してもらう。
// material_id は一意制約があるため、材質1つにつき1行だけ登録できる。

import { useActionState } from 'react'
import {
  createMaterialExtra,
  updateMaterialExtra,
  type MaterialExtraFormState,
} from './actions'

type MaterialOption = { id: string; name: string }

type MaterialExtra = {
  id: string
  material_id: string
  extra_price: number
  blast_furnace_extra: number
}

type MaterialExtraFormProps =
  | { mode: 'create'; materials: MaterialOption[] }
  | { mode: 'edit'; materials: MaterialOption[]; materialExtra: MaterialExtra }

export function MaterialExtraForm(props: MaterialExtraFormProps) {
  const action =
    props.mode === 'create'
      ? createMaterialExtra
      : updateMaterialExtra.bind(null, props.materialExtra.id)

  const [state, formAction, pending] = useActionState<
    MaterialExtraFormState,
    FormData
  >(action, undefined)

  const materialExtra = props.mode === 'edit' ? props.materialExtra : null

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
          defaultValue={materialExtra?.material_id ?? ''}
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
        <label htmlFor="extra_price" className="text-sm">
          材質エキストラ
        </label>
        <input
          id="extra_price"
          name="extra_price"
          type="number"
          step="any"
          required
          defaultValue={materialExtra?.extra_price}
          placeholder="SS400ベース単価への加算（専用単価を持つ材質では未使用）"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="blast_furnace_extra" className="text-sm">
          高炉材加算
        </label>
        <input
          id="blast_furnace_extra"
          name="blast_furnace_extra"
          type="number"
          step="any"
          required
          defaultValue={materialExtra?.blast_furnace_extra}
          placeholder="通常10、SS400は0"
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
