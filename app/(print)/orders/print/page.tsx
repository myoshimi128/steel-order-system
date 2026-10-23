// 現場用伝票の印刷（docs/screen-design.md「現場用伝票の印刷」）。
//
//   /orders/print?no=26-1003-1              現場用（単価なし）
//   /orders/print?no=26-1003-1&copy=price   単価記入用（単価・金額あり）
//   &auto=1                                 開いたらすぐに印刷する（受注登録の「登録して現場用伝票を印刷」から開くとき）
//
// 印刷の画面は、共通レイアウト（ヘッダー・サイドメニュー）を付けないルートグループ app/(print)/ に置く。
// 伝票だけを印刷するためで、印刷のときにヘッダーなどを隠す手間をなくす。
// 印刷できるのは事務・管理者だけ（現場は紙の伝票を受け取るだけで、システムでは印刷しない）。削除した受注は印刷できない。

import Link from 'next/link'
import { OrderSlipPrintScreen } from '@/components/order-slip/order-slip-print-screen'
import { getCurrentUser } from '@/lib/auth'
import { todayInJapan } from '@/lib/order-entry/date'
import { normalizeOrderNo, orderEditHref } from '@/lib/order-entry/order-no'
import { changedSinceLastPrint, loadOrderSlip } from '@/lib/order-slip/load-order-slip'
import { parseSlipCopy } from '@/lib/order-slip/slip-format'
import { buildSlipLines, lineMarkSummaries, sumSlipLines } from '@/lib/order-slip/slip-lines'
import { paginateSlipLines } from '@/lib/order-slip/slip-pages'
import { createClient } from '@/lib/supabase-server'

type PrintOrderSlipPageProps = {
  // URL の ? より後ろの値。Next.js 16 では Promise で渡される
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// 印刷できないときの画面（理由と、受注No. で呼び出す画面への入口）
function Unavailable({ message }: { message: string }) {
  return (
    <main className="flex flex-1 flex-col items-center bg-canvas px-6 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 rounded border border-line bg-white px-6 py-5">
        <p role="alert" className="text-sm text-neutral-700">
          {message}
        </p>
        <Link href={orderEditHref({})} className="self-end rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-hover">
          受注No. で呼び出す
        </Link>
      </div>
    </main>
  )
}

export default async function PrintOrderSlipPage({ searchParams }: PrintOrderSlipPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  if (!user || (user.role !== 'office' && user.role !== 'admin')) {
    return <Unavailable message="伝票を印刷する権限がありません。" />
  }

  const rawNo = typeof params.no === 'string' ? params.no : ''
  const orderNo = normalizeOrderNo(rawNo)
  if (!orderNo) return <Unavailable message="受注No. は 26-1003-1 の形で指定してください。" />

  const supabase = await createClient()
  const slip = await loadOrderSlip(supabase, orderNo)
  if (!slip) return <Unavailable message={`受注No. ${orderNo} は見つかりません。`} />
  if (slip.deleted) return <Unavailable message={`受注No. ${orderNo} は削除されているため、印刷できません。`} />

  const copyKind = parseSlipCopy(params.copy)
  // 伝票の行（品名・寸法・重量・加工の文・板厚の区切り）を組み立て、A4 の横のページに分ける
  const lines = buildSlipLines(slip.items)

  return (
    <OrderSlipPrintScreen
      slip={slip}
      copyKind={copyKind}
      pages={paginateSlipLines(lines)}
      lineMarks={lineMarkSummaries(slip.items)}
      totals={sumSlipLines(lines)}
      issueDate={todayInJapan()}
      changedSinceLastPrint={changedSinceLastPrint(slip.prints[copyKind], slip.updatedAt)}
      auto={params.auto === '1'}
    />
  )
}
