// 受注の変更・削除（処理区分 1 変更・2 削除。docs/screen-design.md「受注の削除・修正」、PR 9b）。
// 受注登録待ちの一覧の「受注No. で呼び出す（変更・削除）」と、受注情報の処理区分の欄で 1・2 を打ったときに開く。
//
//   /orders/edit                       受注No. を打つ画面（OrderLookupScreen）
//   /orders/edit?type=1&no=26-1003-1   呼び出した受注を、受注登録の画面に入力値として戻して直す（OrderEntryScreen の変更）
//   /orders/edit?type=2&no=26-1003-1   呼び出した受注の要約を出し、確かめてから論理削除する（OrderDeleteScreen）
//   ?notice=updated / deleted          保存・削除の後に、受注No. を打つ画面で結果を知らせる
//                                      （変更の後は、現場用伝票を印刷し直す案内も出す。前回の印刷の後に変更されたか）
//
// 呼び出せない受注（見つからない・削除済み・送り状がある）は、受注No. を打つ画面に理由を出す。
// 変更・削除できるのは事務・管理者だけ（DB の関数 update_order・delete_order の中でも確かめる）。

import { cookies } from 'next/headers'
import { OrderDeleteScreen } from '@/components/order-entry/order-delete-screen'
import { OrderEntryScreen } from '@/components/order-entry/order-entry-screen'
import { OrderLookupScreen } from '@/components/order-entry/order-lookup-screen'
import { getCurrentUser } from '@/lib/auth'
import { loadOrderIntakeSource } from '@/lib/intake/load-order-intake-source'
import { todayInJapan } from '@/lib/order-entry/date'
import {
  DOCUMENT_PANEL_OPEN_COOKIE,
  DOCUMENT_PANEL_WIDTH_COOKIE,
  parsePanelOpenCookie,
  parsePanelWidthCookie,
} from '@/lib/order-entry/document-panel-state'
import { loadOrderEntryMasters } from '@/lib/order-entry/load-order-entry-masters'
import { loadOrderForEdit } from '@/lib/order-entry/load-order-for-edit'
import { loadSlipPrintStatus } from '@/lib/order-slip/load-order-slip'
import { normalizeOrderNo, orderEditNoticeText, parseOrderEditType } from '@/lib/order-entry/order-no'
import { headerValuesFromOrder, itemRowsFromOrder, stampOverridesFor } from '@/lib/order-entry/order-to-form'
import { SPLICE_MEMBER_CLASS } from '@/lib/order-entry/constants'
import { designatedStampIds } from '@/lib/order-entry/stamps'
import { createClient } from '@/lib/supabase-server'

// 変更を保存した後の、印刷し直しの案内（OrderLookupScreen の reprint）
type ReprintStatus = { orderNo: string; printed: boolean; changedSinceLastPrint: boolean } | null

type EditOrderPageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function EditOrderPage({ searchParams }: EditOrderPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()

  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <p className="text-sm text-neutral-600">この操作を行う権限がありません。</p>
      </main>
    )
  }

  const type = parseOrderEditType(params.type)
  const rawNo = typeof params.no === 'string' ? params.no : ''
  const notice = orderEditNoticeText(params.notice, params.no)

  const supabase = await createClient()

  // 受注No. を打つ画面（保存・削除の後は、結果を知らせてここに戻る）
  const lookup = (error: string | null, initialOrderNo = rawNo, reprint: ReprintStatus = null) => (
    <OrderLookupScreen type={type} initialOrderNo={initialOrderNo} notice={notice} error={error} reprint={reprint} />
  )
  if (notice) {
    // 変更を保存した後は、現場用伝票を印刷し直す案内を出す（印刷の記録から、前回の印刷の後に変わったかを見る）
    const savedNo = params.notice === 'updated' ? normalizeOrderNo(rawNo) : null
    const status = savedNo ? await loadSlipPrintStatus(supabase, savedNo) : null
    return lookup(null, '', savedNo && status ? { orderNo: savedNo, ...status } : null)
  }
  if (rawNo === '') return lookup(null)

  const orderNo = normalizeOrderNo(rawNo)
  if (!orderNo) return lookup('受注No. は 26-1003-1 の形で入力してください')

  const order = await loadOrderForEdit(supabase, orderNo)
  if (!order) return lookup(`受注No. ${orderNo} は見つかりません`)
  if (order.deleted) return lookup(`受注No. ${orderNo} は削除されています`)
  if (order.hasShipments) {
    return lookup(`受注No. ${orderNo} は送り状が発行されているため、変更・削除できません（送り状を先に取り消してください）`)
  }

  // 上部の帯（受付No.・区分）と注文書のパネル（受付の PDF・この区分のファイル）に使う
  const intake = await loadOrderIntakeSource(supabase, order.workUnitId)
  if (!intake) return lookup(`受注No. ${orderNo} の受付が見つかりません`)

  if (type === 'delete') {
    return <OrderDeleteScreen order={order} intakeNo={intake.intakeNo} />
  }

  // 呼び出した受注を、画面の入力値に戻す（lib/order-entry/order-to-form.ts）
  const masters = await loadOrderEntryMasters(supabase)
  const isSplice = order.header.memberClass === SPLICE_MEMBER_CLASS
  const edit = {
    orderId: order.id,
    orderNo: order.orderNo,
    updatedAt: order.updatedAt,
    header: headerValuesFromOrder(order.header, masters.header),
    items: itemRowsFromOrder(order.items, masters.items, isSplice),
    stampOverrides: stampOverridesFor(
      order.stampIds,
      designatedStampIds(masters.aux.customerStamps, order.header.customerId)
    ),
    freeComment: order.fieldNote,
  }

  // 注文書のパネルの幅と開閉を cookie から読む（新規の画面と同じ）
  const cookieStore = await cookies()
  const panelWidth = parsePanelWidthCookie(cookieStore.get(DOCUMENT_PANEL_WIDTH_COOKIE)?.value)
  const panelOpen = parsePanelOpenCookie(cookieStore.get(DOCUMENT_PANEL_OPEN_COOKIE)?.value)

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      {/* key に受注の id と更新日時を付け、別の受注・保存し直した受注を開いたら入力の状態を作り直す */}
      <OrderEntryScreen
        key={`${order.id}:${order.updatedAt}`}
        masters={masters}
        today={todayInJapan()}
        initialPanelWidth={panelWidth}
        initialPanelOpen={panelOpen}
        intake={intake}
        staffCode={user.employeeNo}
        edit={edit}
      />
    </main>
  )
}
