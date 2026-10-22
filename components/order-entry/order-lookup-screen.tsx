'use client'

// 受注No. で呼び出す画面（処理区分 1 変更・2 削除の入口。PR 9b）。
// 受注登録待ちの一覧の「受注No. で呼び出す（変更・削除）」と、受注情報の処理区分の欄で 1・2 を打ったときに開く。
//   処理区分（1 変更 / 2 削除）→ 受注No.（26-1003-1）→ Enter で呼び出す
// 受注No. の欄は文字の欄（TextField）のため、「-」はハイフンとしてそのまま入る
// （明細の「切断・区分」の欄の「-」は行番号の複写だが、それは番号の欄だけの操作）。
// 打った受注No. は lib/order-entry/order-no.ts でそろえ（26 1003 1 → 26-1003-1）、URL の ?type=&no= にして開き直す。
// 処理区分で 0 新規を打つと、受注登録待ちの一覧へ戻る（新規の登録は一覧から始める）。

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CodeField } from '@/components/code-input/code-field'
import { TextField } from '@/components/code-input/text-field'
import { FormItem } from '@/components/order-entry/header/form-item'
import { findCodeOption } from '@/lib/code-input/code-option'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import { useFieldNavigation } from '@/lib/hooks/use-field-navigation'
import { queueHref } from '@/lib/intake/queue'
import { PROCESSING_TYPE_OPTIONS } from '@/lib/order-entry/constants'
import { normalizeOrderNo, orderEditHref } from '@/lib/order-entry/order-no'

type OrderLookupScreenProps = {
  // 最初の処理区分（URL の ?type=）
  type: 'edit' | 'delete'
  // 欄に最初から入れておく受注No.
  initialOrderNo: string
  // 保存・削除の結果のお知らせ
  notice: string | null
  // 呼び出せなかった理由（見つからない・削除済み・送り状がある など）
  error: string | null
}

const SUBMIT_ID = 'order-lookup-submit'
// 受注No. の欄の文字数の上限（26-10000-99 まで入る長さ）
const ORDER_NO_MAX_LENGTH = 14

export function OrderLookupScreen({ type, initialOrderNo, notice, error }: OrderLookupScreenProps) {
  const router = useRouter()
  const [typeCode, setTypeCode] = useState(type === 'delete' ? '2' : '1')
  const [orderNo, setOrderNo] = useState(initialOrderNo)
  const [inputError, setInputError] = useState<string | null>(null)
  const navigation = useFieldNavigation(['processingType', 'orderNo', SUBMIT_ID])

  // 開いたら、受注No. の欄にカーソルを置く（処理区分は URL で決まっていることが多いため）
  const { focusField } = navigation
  useEffect(() => {
    focusField('orderNo')
  }, [focusField])

  const processingType = findCodeOption(PROCESSING_TYPE_OPTIONS, typeCode)?.value

  // 0 新規を打ったら、受注登録待ちの一覧へ（新規の登録は一覧の行から始める）
  useEffect(() => {
    if (processingType === 'new') router.push(queueHref())
  }, [processingType, router])

  function lookup() {
    if (processingType !== 'edit' && processingType !== 'delete') {
      setInputError('処理区分は 1 変更か 2 削除を選んでください')
      navigation.focusField('processingType')
      return
    }
    const normalized = normalizeOrderNo(orderNo)
    if (!normalized) {
      setInputError('受注No. は 26-1003-1 の形で入力してください')
      navigation.focusField('orderNo')
      return
    }
    setInputError(null)
    router.push(orderEditHref({ type: processingType, no: normalized }))
  }

  return (
    <main className="flex flex-1 flex-col bg-canvas px-8 py-6" onKeyDown={navigation.handleArrowKeys}>
      <p className="text-sm text-neutral-500">登録済みの受注を受注No. で呼び出して、直したり削除したりします</p>
      <h1 className="mt-1 text-2xl font-bold text-neutral-900">受注の変更・削除</h1>

      {notice && (
        <p role="status" className="mt-4 rounded border border-navy/20 bg-navy-soft px-4 py-2.5 text-sm font-semibold text-navy">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded border border-urgent/30 bg-urgent/5 px-4 py-2.5 text-sm text-urgent">
          {error}
        </p>
      )}

      <section className="mt-5 flex max-w-xl flex-col gap-4 rounded border border-line bg-white px-6 py-5">
        <FormItem label="処理区分" htmlFor="processingType" note="1 変更 ／ 2 削除 ／ 0 で受注登録待ちへ">
          <CodeField
            {...navigation.fieldProps('processingType')}
            listTitle="処理区分"
            options={PROCESSING_TYPE_OPTIONS}
            maxLength={CODE_LENGTHS.processingType}
            code={typeCode}
            onCodeChange={setTypeCode}
            codeWidthClass="w-12"
            nameWidthClass="w-20"
          />
        </FormItem>
        <FormItem label="受注No." htmlFor="orderNo" required note="例: 26-1003-1（「-」はハイフン）">
          <TextField
            {...navigation.fieldProps('orderNo')}
            value={orderNo}
            onValueChange={(value) => {
              setOrderNo(value)
              setInputError(null)
            }}
            // 最後の欄で Enter を押したら、そのまま呼び出す
            onNext={lookup}
            error={inputError ?? undefined}
            maxLength={ORDER_NO_MAX_LENGTH}
            widthClass="w-48"
          />
        </FormItem>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => router.push(queueHref())}
            className="rounded border border-line bg-white px-4 py-2 text-sm text-neutral-700 hover:bg-canvas"
          >
            受注登録待ちに戻る
          </button>
          <button
            id={SUBMIT_ID}
            ref={navigation.register(SUBMIT_ID)}
            type="button"
            onClick={lookup}
            className="rounded bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-hover"
          >
            呼び出す
          </button>
        </div>
      </section>
    </main>
  )
}
