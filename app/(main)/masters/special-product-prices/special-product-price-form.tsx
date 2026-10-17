'use client'

// 新規登録・編集の両方で使う入力フォーム。
// special_product_prices は material_id を持たないため、種類→板厚（材質はまたがない）の
// 連動プルダウンにしている（lib/use-product-cascade.ts の useMaterialFilter: false）。
// 板厚は下限・上限とも登録済みの板厚から選ぶ（自由入力にしない）。

import { useActionState, useState } from 'react'
import {
  createSpecialProductPrice,
  updateSpecialProductPrice,
  type SpecialProductPriceFormState,
} from './actions'
import { useProductCascade } from '@/lib/use-product-cascade'
import type { ProductCatalogEntry } from '@/lib/product-catalog'

type SpecialProductTypeOption = { id: string; name: string }
type PlateTypeOption = { id: string; name: string }

type SpecialProductPrice = {
  id: string
  special_product_type_id: string
  plate_type_id: string
  has_shot: boolean
  thickness_min: number
  thickness_max: number
  unit_price: number
  valid_from: string
}

type SpecialProductPriceFormProps = {
  specialProductTypes: SpecialProductTypeOption[]
  plateTypes: PlateTypeOption[]
  products: ProductCatalogEntry[]
} & (
  | { mode: 'create' }
  | { mode: 'edit'; specialProductPrice: SpecialProductPrice }
)

export function SpecialProductPriceForm(props: SpecialProductPriceFormProps) {
  const action =
    props.mode === 'create'
      ? createSpecialProductPrice
      : updateSpecialProductPrice.bind(null, props.specialProductPrice.id)

  const [state, formAction, pending] = useActionState<
    SpecialProductPriceFormState,
    FormData
  >(action, undefined)

  const specialProductPrice =
    props.mode === 'edit' ? props.specialProductPrice : null

  const cascade = useProductCascade(props.products, {
    useMaterialFilter: false,
    initialPlateTypeId: specialProductPrice?.plate_type_id,
  })

  const [thicknessMin, setThicknessMin] = useState(
    specialProductPrice?.thickness_min ?? ''
  )
  const [thicknessMax, setThicknessMax] = useState(
    specialProductPrice?.thickness_max ?? ''
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="special_product_type_id" className="text-sm">
          特殊製品種別
        </label>
        <select
          id="special_product_type_id"
          name="special_product_type_id"
          required
          defaultValue={specialProductPrice?.special_product_type_id ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          {props.specialProductTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="plate_type_id" className="text-sm">
          種類
        </label>
        <select
          id="plate_type_id"
          name="plate_type_id"
          required
          value={cascade.plateTypeId}
          onChange={(e) => {
            cascade.setPlateTypeId(e.target.value)
            setThicknessMin('')
            setThicknessMax('')
          }}
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

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="has_shot"
          defaultChecked={specialProductPrice?.has_shot}
        />
        ショット加工あり（スプライスのみ使用）
      </label>

      <div className="flex gap-4">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="thickness_min" className="text-sm">
            板厚下限（mm）
          </label>
          <select
            id="thickness_min"
            name="thickness_min"
            required
            value={thicknessMin}
            onChange={(e) => setThicknessMin(e.target.value)}
            disabled={!cascade.plateTypeId}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="" disabled>
              選択してください
            </option>
            {cascade.thicknesses.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="thickness_max" className="text-sm">
            板厚上限（mm）
          </label>
          <select
            id="thickness_max"
            name="thickness_max"
            required
            value={thicknessMax}
            onChange={(e) => setThicknessMax(e.target.value)}
            disabled={!cascade.plateTypeId}
            className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="" disabled>
              選択してください
            </option>
            {cascade.thicknesses.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="unit_price" className="text-sm">
          単価（kg）
        </label>
        <input
          id="unit_price"
          name="unit_price"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={specialProductPrice?.unit_price}
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
          defaultValue={specialProductPrice?.valid_from}
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
