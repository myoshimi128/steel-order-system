'use client'

// 新規登録・編集の両方で使う入力フォーム。

import { useActionState } from 'react'
import {
  createSpecialProductType,
  updateSpecialProductType,
  type SpecialProductTypeFormState,
} from './actions'

type SpecialProductType = {
  id: string
  name: string
  weight_basis: '実重量' | '角重量' | '使用材重量'
  min_weight: number | null
  applies_thickness_extra: boolean
  applies_large_plate_extra: boolean
  always_piece_price: boolean
  has_light_tier: boolean
  irregular_cut_quote_required: boolean
  is_active: boolean
}

type SpecialProductTypeFormProps =
  | { mode: 'create' }
  | { mode: 'edit'; specialProductType: SpecialProductType }

export function SpecialProductTypeForm(props: SpecialProductTypeFormProps) {
  const action =
    props.mode === 'create'
      ? createSpecialProductType
      : updateSpecialProductType.bind(null, props.specialProductType.id)

  const [state, formAction, pending] = useActionState<
    SpecialProductTypeFormState,
    FormData
  >(action, undefined)

  const specialProductType =
    props.mode === 'edit' ? props.specialProductType : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          種別名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={specialProductType?.name}
          placeholder="スプライス、ササラ、ベタ丸、ドーナツ など"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="weight_basis" className="text-sm">
          重量の基準
        </label>
        <select
          id="weight_basis"
          name="weight_basis"
          required
          defaultValue={specialProductType?.weight_basis ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          <option value="実重量">実重量</option>
          <option value="角重量">角重量</option>
          <option value="使用材重量">使用材重量</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="min_weight" className="text-sm">
          最低保証重量
        </label>
        <input
          id="min_weight"
          name="min_weight"
          type="number"
          step="any"
          min="0"
          defaultValue={specialProductType?.min_weight ?? ''}
          placeholder="スプライスは3、他は空欄"
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="applies_thickness_extra"
          defaultChecked={specialProductType?.applies_thickness_extra}
        />
        板厚エキストラを適用する
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="applies_large_plate_extra"
          defaultChecked={specialProductType?.applies_large_plate_extra}
        />
        大板加算を適用する
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="always_piece_price"
          defaultChecked={specialProductType?.always_piece_price}
        />
        常に枚単価で表示する
      </label>

      {/* 最低保証重量に 1.5kg の段があるか（ベタ丸・ドーナツ）。
          最低保証重量を入力した種別（スプライス）は、この段ではなく最低保証重量が使われる */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="has_light_tier"
          defaultChecked={specialProductType?.has_light_tier}
        />
        1.5kg の段あり（1.5kg 未満は kg単価 × 1.5）
      </label>

      {/* 寸法切を前提とした単価の種別（スプライス）は、アイトレなら別途見積もりにする */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="irregular_cut_quote_required"
          defaultChecked={specialProductType?.irregular_cut_quote_required}
        />
        アイトレは別途見積もり
      </label>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={specialProductType?.is_active}
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
