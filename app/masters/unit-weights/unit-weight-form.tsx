'use client'

// 新規登録・編集の両方で使う入力フォーム。
// unit_weights は material_id を持たないため、種類→板厚（材質はまたがない）の
// 連動プルダウンにしている（lib/use-product-cascade.ts の useMaterialFilter: false）。
// メーカーは products 由来ではなく独立した select（単位質量はメーカーごとに実測するため）。

import { useActionState, useState } from 'react'
import {
  createUnitWeight,
  updateUnitWeight,
  type UnitWeightFormState,
} from './actions'
import { useProductCascade } from '@/lib/use-product-cascade'
import type { ProductCatalogEntry } from '@/lib/product-catalog'

type PlateTypeOption = { id: string; name: string }
type ManufacturerOption = { id: string; name: string }

type UnitWeight = {
  id: string
  plate_type_id: string
  manufacturer_id: string
  thickness: number
  unit_weight: number
  is_active: boolean
}

type UnitWeightFormProps = {
  plateTypes: PlateTypeOption[]
  manufacturers: ManufacturerOption[]
  products: ProductCatalogEntry[]
} & ({ mode: 'create' } | { mode: 'edit'; unitWeight: UnitWeight })

export function UnitWeightForm(props: UnitWeightFormProps) {
  const action =
    props.mode === 'create'
      ? createUnitWeight
      : updateUnitWeight.bind(null, props.unitWeight.id)

  const [state, formAction, pending] = useActionState<
    UnitWeightFormState,
    FormData
  >(action, undefined)

  const unitWeight = props.mode === 'edit' ? props.unitWeight : null

  const cascade = useProductCascade(props.products, {
    useMaterialFilter: false,
    initialPlateTypeId: unitWeight?.plate_type_id,
  })

  const [thickness, setThickness] = useState(unitWeight?.thickness ?? '')

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
          value={cascade.plateTypeId}
          onChange={(e) => {
            cascade.setPlateTypeId(e.target.value)
            setThickness('')
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

      <div className="flex flex-col gap-1">
        <label htmlFor="manufacturer_id" className="text-sm">
          メーカー
        </label>
        <select
          id="manufacturer_id"
          name="manufacturer_id"
          required
          defaultValue={unitWeight?.manufacturer_id ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          {props.manufacturers.map((manufacturer) => (
            <option key={manufacturer.id} value={manufacturer.id}>
              {manufacturer.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="thickness" className="text-sm">
          板厚（mm）
        </label>
        <select
          id="thickness"
          name="thickness"
          required
          value={thickness}
          onChange={(e) => setThickness(e.target.value)}
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

      <div className="flex flex-col gap-1">
        <label htmlFor="unit_weight" className="text-sm">
          単位質量（kg/m²）
        </label>
        <input
          id="unit_weight"
          name="unit_weight"
          type="number"
          step="any"
          min="0"
          required
          defaultValue={unitWeight?.unit_weight}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={unitWeight?.is_active}
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
