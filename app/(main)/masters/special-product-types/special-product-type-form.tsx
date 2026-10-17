'use client'

// 新規登録・編集の両方で使う入力フォーム。

import { useActionState } from 'react'
import { NumberField } from '@/components/masters/number-field'
import { RESERVED_REGION_NUMBERS } from '@/lib/master-number'
import {
  createSpecialProductType,
  updateSpecialProductType,
  type SpecialProductTypeFormState,
} from './actions'

type SpecialProductType = {
  id: string
  number: number
  name: string
  weight_basis: '実重量' | '角重量' | '使用材重量'
  dimension_shape: '角' | '円' | 'ドーナツ'
  min_weight: number | null
  applies_thickness_extra: boolean
  applies_large_plate_extra: boolean
  always_piece_price: boolean
  has_light_tier: boolean
  irregular_cut_quote_required: boolean
  is_splice_order_type: boolean
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
      {/* 受注登録画面の「区分」の番号として使う。区分の定数と重なる番号は使えない */}
      <NumberField
        defaultValue={specialProductType?.number}
        note={`${RESERVED_REGION_NUMBERS.join('・')} は区分（寸法切・アイトレ・定尺・加工）の番号のため使えません`}
      />

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

      {/* 受注登録画面の明細で、寸法の入力欄を切り替えるために使う */}
      <div className="flex flex-col gap-1">
        <label htmlFor="dimension_shape" className="text-sm">
          寸法の形
        </label>
        <select
          id="dimension_shape"
          name="dimension_shape"
          required
          defaultValue={specialProductType?.dimension_shape ?? '角'}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="角">角（縦 × 横）</option>
          <option value="円">円（直径）</option>
          <option value="ドーナツ">ドーナツ（外径 × 内径）</option>
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

      {/* スプライス専用の受注（受注単位で切り替える）の明細に使う種別。1 つだけ指定できる。
          この種別は通常の受注の区分の一覧には出さない */}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_splice_order_type"
          defaultChecked={specialProductType?.is_splice_order_type}
        />
        スプライス受注用の種別（通常の受注の区分には出さない）
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
