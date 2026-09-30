'use server'

// 受注登録（新規）の保存を行う Server Action。
//
// 現時点ではヘッダー（orders）だけを登録する。明細を実装するときに、
// ヘッダーと明細をまとめて 1 回で保存する形に作り替える。
//
// 画面側でも同じ確認（validateOrderHeader）をしているが、画面を経由しない呼び出しもありうるため、
// サーバー側でもう一度確認する。登録の権限は RLS（orders_insert_office_admin）でも強制されている。
// 受注番号は DB の初期値（private.next_order_no()）で自動採番されるため、ここでは指定しない。

import { getCurrentUser } from '@/lib/auth'
import {
  hasErrors,
  validateOrderHeader,
  type OrderHeaderErrors,
  type OrderHeaderInput,
} from '@/lib/order-entry/validate-order-header'
import { createClient } from '@/lib/supabase-server'

export type CreateOrderHeaderResult =
  | { ok: true; orderNo: string }
  | { ok: false; errors?: OrderHeaderErrors; message?: string }

// 空文字は NULL として保存する（任意項目の未入力）
function nullIfEmpty(value: string): string | null {
  return value.trim() === '' ? null : value.trim()
}

export async function createOrderHeader(
  input: OrderHeaderInput
): Promise<CreateOrderHeaderResult> {
  // 受注を起票できるのは事務・管理者のみ（現場は受注を起票しない）
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return { ok: false, message: '受注を登録する権限がありません' }
  }

  const supabase = await createClient()

  // 配達がフリー（文字の入力が必要）かどうかを DB の値で確認する
  let deliveryMethodRequiresNote = false
  if (input.deliveryMethodId) {
    const { data: deliveryMethod } = await supabase
      .from('delivery_methods')
      .select('requires_note')
      .eq('id', input.deliveryMethodId)
      .maybeSingle()
    if (!deliveryMethod) {
      return { ok: false, errors: { deliveryMethodId: '存在しない配達方法です' } }
    }
    deliveryMethodRequiresNote = deliveryMethod.requires_note
  }

  const errors = validateOrderHeader(input, { deliveryMethodRequiresNote })
  if (hasErrors(errors)) {
    return { ok: false, errors }
  }

  // validateOrderHeader で必須項目は確認済みのため、ここでは値が入っている
  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_date: input.orderDate,
      is_splice: input.isSplice,
      // 通常の受注では継手番号・ショットを保存しない（orders_splice_columns_check）
      joint_no: input.isSplice ? input.jointNo.trim() : null,
      splice_shot: input.isSplice ? input.spliceShot : null,
      customer_id: input.customerId!,
      customer_contact: nullIfEmpty(input.customerContact),
      delivery_destination_id: input.deliveryDestinationId!,
      project_name: nullIfEmpty(input.projectName),
      due_date_type: input.dueDateType!,
      // 後報・最短出荷は日付を持たない
      due_date: nullIfEmpty(input.dueDate),
      delivery_method_id: input.deliveryMethodId!,
      delivery_method_note: deliveryMethodRequiresNote
        ? nullIfEmpty(input.deliveryMethodNote)
        : null,
      // 起案者はログイン中のユーザー
      created_by: user.id,
    })
    .select('order_no')
    .single()

  if (error || !data) {
    return { ok: false, message: `登録に失敗しました: ${error?.message ?? '不明なエラー'}` }
  }

  return { ok: true, orderNo: data.order_no }
}
