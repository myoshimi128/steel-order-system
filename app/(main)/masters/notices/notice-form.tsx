'use client'

// 得意先の注意事項の新規登録・編集で使う入力フォーム。
// 得意先は必須。切断方法・加工種別は任意で、指定した条件がすべて受注に当てはまったときだけ表示される
// （例: 得意先 × レーザー →「ケガキマーキング不可。インクジェットマーキング指定」）。

import { useActionState } from 'react'
import { NOTICE_CUTTING_METHODS } from '@/lib/order-entry/notices'
import { createNotice, updateNotice, type NoticeFormState } from './actions'

type Notice = {
  id: string
  customer_id: string
  cutting_method: string | null
  process_type_id: string | null
  body: string
  priority: number
  is_active: boolean
}

// 選択肢（page.tsx でサーバーから取得して渡す）
type CustomerOption = { id: string; code: string; name: string }
type ProcessTypeOption = { id: string; number: number | null; name: string }

type NoticeFormProps = {
  customers: CustomerOption[]
  processTypes: ProcessTypeOption[]
} & ({ mode: 'create' } | { mode: 'edit'; notice: Notice })

const INPUT_CLASS =
  'rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900'

export function NoticeForm(props: NoticeFormProps) {
  const action =
    props.mode === 'create' ? createNotice : updateNotice.bind(null, props.notice.id)

  const [state, formAction, pending] = useActionState<NoticeFormState, FormData>(
    action,
    undefined
  )

  const notice = props.mode === 'edit' ? props.notice : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="customer_id" className="text-sm">
          得意先
        </label>
        <select
          id="customer_id"
          name="customer_id"
          required
          defaultValue={notice?.customer_id ?? ''}
          className={INPUT_CLASS}
        >
          <option value="" disabled>
            選択してください
          </option>
          {props.customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.code} {customer.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        切断方法・加工種別を指定すると、受注のどこかの行にその切断方法・加工種別があるときだけ表示します。
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="cutting_method" className="text-sm">
          切断方法（任意）
        </label>
        <select
          id="cutting_method"
          name="cutting_method"
          defaultValue={notice?.cutting_method ?? ''}
          className={INPUT_CLASS}
        >
          <option value="">指定なし</option>
          {NOTICE_CUTTING_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="process_type_id" className="text-sm">
          加工種別（任意）
        </label>
        <select
          id="process_type_id"
          name="process_type_id"
          defaultValue={notice?.process_type_id ?? ''}
          className={INPUT_CLASS}
        >
          <option value="">指定なし</option>
          {props.processTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.number ?? '—'} {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="body" className="text-sm">
          本文
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={3}
          defaultValue={notice?.body}
          placeholder="精度に厳しい、記号記入はケガキ NG など"
          className={INPUT_CLASS}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="priority" className="text-sm">
          表示順
        </label>
        <input
          id="priority"
          name="priority"
          type="text"
          inputMode="numeric"
          defaultValue={notice?.priority ?? 0}
          className={`w-32 ${INPUT_CLASS}`}
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">小さいほど上に表示します</p>
      </div>

      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_active" defaultChecked={notice?.is_active} />
          有効
        </label>
      )}

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
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
