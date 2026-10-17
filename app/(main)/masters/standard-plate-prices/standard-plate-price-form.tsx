'use client'

// 新規登録・編集の両方で使う入力フォーム。
// 種類→材質→板厚は products（商品マスタ）に実際に登録されている組み合わせから
// 選ぶ連動プルダウンにしている（lib/use-product-cascade.ts）。板厚は自由入力にしない。

import { useActionState, useState } from 'react'
import {
  createStandardPlatePrice,
  updateStandardPlatePrice,
  type StandardPlatePriceFormState,
} from './actions'
import { useProductCascade } from '@/lib/use-product-cascade'
import type { ProductCatalogEntry } from '@/lib/product-catalog'

type PlateTypeOption = { id: string; name: string }
type MaterialOption = { id: string; name: string }

type StandardPlatePrice = {
  id: string
  plate_type_id: string
  material_id: string | null
  thickness: number
  plate_size: '3x6' | '4x8' | '5x10'
  unit_price: number
  valid_from: string
}

type StandardPlatePriceFormProps = {
  plateTypes: PlateTypeOption[]
  materials: MaterialOption[]
  products: ProductCatalogEntry[]
} & ({ mode: 'create' } | { mode: 'edit'; standardPlatePrice: StandardPlatePrice })

export function StandardPlatePriceForm(props: StandardPlatePriceFormProps) {
  const action =
    props.mode === 'create'
      ? createStandardPlatePrice
      : updateStandardPlatePrice.bind(null, props.standardPlatePrice.id)

  const [state, formAction, pending] = useActionState<
    StandardPlatePriceFormState,
    FormData
  >(action, undefined)

  const standardPlatePrice =
    props.mode === 'edit' ? props.standardPlatePrice : null

  const cascade = useProductCascade(props.products, {
    useMaterialFilter: true,
    initialPlateTypeId: standardPlatePrice?.plate_type_id,
    initialMaterialId: standardPlatePrice?.material_id,
  })

  const [thickness, setThickness] = useState(
    standardPlatePrice?.thickness ?? ''
  )

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
            cascade.setMaterialId('')
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
        <label htmlFor="material_id" className="text-sm">
          材質
        </label>
        <select
          id="material_id"
          name="material_id"
          value={cascade.materialId}
          onChange={(e) => {
            cascade.setMaterialId(e.target.value)
            setThickness('')
          }}
          disabled={!cascade.plateTypeId}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {/* ボンデ・ミガキなど無規格の商品は材質を持たないため、空欄（NULL）を選べるようにする */}
          <option value="">（材質なし）</option>
          {props.materials
            .filter((material) => cascade.materialIds.has(material.id))
            .map((material) => (
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
        <label htmlFor="plate_size" className="text-sm">
          サイズ
        </label>
        <select
          id="plate_size"
          name="plate_size"
          required
          defaultValue={standardPlatePrice?.plate_size ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          <option value="3x6">3x6</option>
          <option value="4x8">4x8</option>
          <option value="5x10">5x10</option>
        </select>
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
          defaultValue={standardPlatePrice?.unit_price}
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
          defaultValue={standardPlatePrice?.valid_from}
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
