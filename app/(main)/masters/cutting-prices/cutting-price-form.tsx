'use client'

// 新規登録・編集の両方で使う入力フォーム。
// 種類→板厚は products（商品マスタ）に実際に登録されている組み合わせから
// 選ぶ連動プルダウンにしている（lib/use-product-cascade.ts）。
// 板厚は下限・上限とも登録済みの板厚から選ぶ（自由入力にしない）。
//
// 材質プルダウンは products の登録状況ではなく、専用単価を持つ材質
// （materials.has_dedicated_price）だけを選択肢にする。専用単価を持たない材質は
// 「指定なし＝SS400ベース」を選び、材質エキストラで単価差を吸収するため。
// また、種類が材質エキストラを適用しない種類（plate_types.applies_material_extra
// が false。縞板・ボンデ・ミガキ）のときは、材質は「指定なし」固定にする。

import { useActionState, useState } from 'react'
import {
  createCuttingPrice,
  updateCuttingPrice,
  type CuttingPriceFormState,
} from './actions'
import { useProductCascade } from '@/lib/use-product-cascade'
import type { ProductCatalogEntry } from '@/lib/product-catalog'

type PlateTypeOption = { id: string; name: string; applies_material_extra: boolean }
type MaterialOption = { id: string; name: string; has_dedicated_price: boolean }

type CuttingPrice = {
  id: string
  plate_type_id: string
  material_id: string | null
  thickness_min: number
  thickness_max: number
  cutting_method: 'シャーリング' | 'ガス' | 'レーザー' | 'プラズマ'
  cutting_type: '寸法切' | 'アイトレ'
  unit_price: number | null
  valid_from: string
  has_light_tier: boolean
  small_piece_quote_required: boolean
}

type CuttingPriceFormProps = {
  plateTypes: PlateTypeOption[]
  materials: MaterialOption[]
  products: ProductCatalogEntry[]
} & ({ mode: 'create' } | { mode: 'edit'; cuttingPrice: CuttingPrice })

export function CuttingPriceForm(props: CuttingPriceFormProps) {
  const action =
    props.mode === 'create'
      ? createCuttingPrice
      : updateCuttingPrice.bind(null, props.cuttingPrice.id)

  const [state, formAction, pending] = useActionState<
    CuttingPriceFormState,
    FormData
  >(action, undefined)

  const cuttingPrice = props.mode === 'edit' ? props.cuttingPrice : null

  const cascade = useProductCascade(props.products, {
    useMaterialFilter: true,
    // 「指定なし」は無規格（材質なし）ではなく SS400ベースを意味するため、
    // 板厚は材質を問わずその種類全体から選べるようにする
    blankMeansNullMaterial: false,
    initialPlateTypeId: cuttingPrice?.plate_type_id,
    initialMaterialId: cuttingPrice?.material_id,
  })

  const [thicknessMin, setThicknessMin] = useState(
    cuttingPrice?.thickness_min ?? ''
  )
  const [thicknessMax, setThicknessMax] = useState(
    cuttingPrice?.thickness_max ?? ''
  )

  // 選択中の種類が材質エキストラを適用しない種類（縞板・ボンデ・ミガキ）かどうか。
  // その場合は材質を選ばせず「指定なし」に固定する
  const selectedPlateType = props.plateTypes.find(
    (plateType) => plateType.id === cascade.plateTypeId
  )
  const materialSelectableForPlateType =
    selectedPlateType?.applies_material_extra ?? true

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
            // 種類を変えたら、その種類に存在しない材質・板厚が選ばれたままにならないようリセットする
            cascade.setMaterialId('')
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
            // 材質を変えたら、その組み合わせに存在しない板厚が選ばれたままにならないようリセットする
            setThicknessMin('')
            setThicknessMax('')
          }}
          disabled={!cascade.plateTypeId || !materialSelectableForPlateType}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          {/* 空欄は SS400 ベースの共通単価（材質エキストラを加算して使う） */}
          <option value="">（指定なし＝SS400ベース）</option>
          {props.materials
            .filter((material) => material.has_dedicated_price)
            .map((material) => (
              <option key={material.id} value={material.id}>
                {material.name}
              </option>
            ))}
        </select>
      </div>

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
            {cascade.thicknesses.map((thickness) => (
              <option key={thickness} value={thickness}>
                {thickness}
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
            {cascade.thicknesses.map((thickness) => (
              <option key={thickness} value={thickness}>
                {thickness}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cutting_method" className="text-sm">
          切断方法
        </label>
        <select
          id="cutting_method"
          name="cutting_method"
          required
          defaultValue={cuttingPrice?.cutting_method ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          <option value="シャーリング">シャーリング</option>
          <option value="ガス">ガス</option>
          <option value="レーザー">レーザー</option>
          <option value="プラズマ">プラズマ</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="cutting_type" className="text-sm">
          寸法切／アイトレ
        </label>
        <select
          id="cutting_type"
          name="cutting_type"
          required
          defaultValue={cuttingPrice?.cutting_type ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="" disabled>
            選択してください
          </option>
          <option value="寸法切">寸法切</option>
          <option value="アイトレ">アイトレ</option>
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
          defaultValue={cuttingPrice?.unit_price ?? ''}
          placeholder="空欄は都度見積もり"
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
          defaultValue={cuttingPrice?.valid_from}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {/* 最低保証重量に関するフラグ（docs/basic-design.md「最低保証重量」） */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="has_light_tier"
          defaultChecked={cuttingPrice?.has_light_tier}
        />
        1.5kg の段あり（1.5kg 未満は kg単価 × 1.5）
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="small_piece_quote_required"
          defaultChecked={cuttingPrice?.small_piece_quote_required}
        />
        1枚 2kg 未満は別途見積もり
      </label>

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
