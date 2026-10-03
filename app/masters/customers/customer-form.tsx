'use client'

// 新規登録・編集の両方で使う入力フォーム。
// mode: 'create' のときは createCustomer を、mode: 'edit' のときは
// customerId を bind した updateCustomer を Server Action として使う。

import { useActionState } from 'react'
import { NameKanaField } from '@/components/masters/name-kana-field'
import { createCustomer, updateCustomer, type CustomerFormState } from './actions'

type Customer = {
  id: string
  code: string
  name: string
  name_kana: string | null
  sales_rep: string | null
  is_active: boolean
}

// スタンプの選択肢（page.tsx でサーバーから取得して渡す）
type StampOption = { id: string; number: number; body: string; is_active: boolean }

type CustomerFormProps = {
  stamps: StampOption[]
  // 今の指定スタンプの id（新規登録では空）
  designatedStampIds: string[]
} & ({ mode: 'create' } | { mode: 'edit'; customer: Customer })

export function CustomerForm(props: CustomerFormProps) {
  const action =
    props.mode === 'create'
      ? createCustomer
      : updateCustomer.bind(null, props.customer.id)

  // useActionState は [今の状態, フォーム送信用の関数, 送信中かどうか] を返す
  const [state, formAction, pending] = useActionState<
    CustomerFormState,
    FormData
  >(action, undefined)

  const customer = props.mode === 'edit' ? props.customer : null

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="code" className="text-sm">
          得意先コード
        </label>
        <input
          id="code"
          name="code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          required
          defaultValue={customer?.code}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm">
          得意先名
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={customer?.name}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <NameKanaField defaultValue={customer?.name_kana} />

      <div className="flex flex-col gap-1">
        <label htmlFor="sales_rep" className="text-sm">
          営業担当
        </label>
        <input
          id="sales_rep"
          name="sales_rep"
          type="text"
          defaultValue={customer?.sales_rep ?? ''}
          className="rounded border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {/* 指定スタンプ: 受注登録画面で、この得意先を選んだ時点でチェックが入るスタンプ */}
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm">指定スタンプ</legend>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          受注登録画面でこの得意先を選ぶと、チェックした文言に最初からチェックが入ります
        </p>
        {props.stamps.length === 0 && (
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            スタンプが登録されていません（スタンプマスタで登録します）
          </p>
        )}
        {props.stamps.map((stamp) => (
          <label key={stamp.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="stamp_ids"
              value={stamp.id}
              defaultChecked={props.designatedStampIds.includes(stamp.id)}
            />
            <span className="w-6 text-right tabular-nums text-neutral-500">{stamp.number}</span>
            {stamp.body}
            {!stamp.is_active && (
              <span className="text-xs text-neutral-400">（無効）</span>
            )}
          </label>
        ))}
      </fieldset>

      {/* 有効フラグは新規登録時には常に true で作られるため、編集画面にのみ置く */}
      {props.mode === 'edit' && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={customer?.is_active}
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
