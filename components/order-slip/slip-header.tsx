// 現場用伝票の上部（どのページにも同じものを出す）。
// 伝票が工程の間でばらけても、どの受注のものか分かるよう、受注No.・得意先・納期などを 2 ページ目以降にも出す。
//
//   1 段目: 伝票の名前 / 受注No.（大きく）・納期の枠（受注No. と同じ大きさ。配達も並べる）・至急・ショット加工 /
//           発行日・発行の回数・ページ
//   2 段目: 得意先（客先担当）・納入先・工事名
//   3 段目: 営業担当・起案者・加工場所・部材区分・受付No.（区分）・受注日
// 至急・ショット加工は、白黒で印刷しても目立つよう、黒地に白の太字にする（色に頼らない）。
// 納期は現場がいちばん気にする項目なので、小さな欄に並べず、受注No. の横に大きく出す（SlipDueDate）。

import type { LoadedOrderSlip } from '@/lib/order-slip/load-order-slip'
import { issueCountText, slipDueDate } from '@/lib/order-slip/slip-format'
import { formatDisplayDate } from '@/lib/order-entry/date'
import { SlipDueDate } from './slip-due-date'
import { SlipField } from './slip-field'

type SlipHeaderProps = {
  slip: LoadedOrderSlip
  // 発行日（印刷した日。日本時間の YYYY-MM-DD）
  issueDate: string
  issueCount: number
  pageNo: number
  pageCount: number
}

export function SlipHeader({ slip, issueDate, issueCount, pageNo, pageCount }: SlipHeaderProps) {
  const customer = slip.customerContact ? `${slip.customerName}（${slip.customerContact}）` : slip.customerName
  const memberClass = slip.memberClassLabel
    ? slip.jointNo
      ? `${slip.memberClassLabel}（継手 ${slip.jointNo}）`
      : slip.memberClassLabel
    : null
  const dueDate = slipDueDate(slip.dueDateType, slip.dueDate, slip.deliveryMethodName, slip.deliveryMethodNote)
  const intake = slip.intakeNo ? `${slip.intakeNo}${slip.workUnitLabel ? `（${slip.workUnitLabel}）` : ''}` : null

  return (
    <header className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="shrink-0 text-xl font-bold tracking-widest text-neutral-900">加工指示書</h1>

        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-baseline gap-2">
            <span className="text-xs text-neutral-600">受注No.</span>
            {/* 加工指示No. は受注No. で兼ねる（受注 1 件に伝票 1 枚のため、別の番号は作らない） */}
            <span className="text-3xl font-bold tabular-nums tracking-wide text-neutral-900">{slip.orderNo}</span>
          </div>
          <SlipDueDate dueDate={dueDate} />
          {slip.isUrgent && (
            <span className="shrink-0 rounded bg-neutral-900 px-3 py-1 text-2xl font-black tracking-widest text-white">至急</span>
          )}
          {slip.shot && (
            <span className="shrink-0 rounded bg-neutral-900 px-3 py-1 text-xl font-black tracking-wider text-white">ショット加工</span>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end text-xs leading-tight text-neutral-700">
          <span>発行日 {formatDisplayDate(issueDate)}</span>
          <span className="font-semibold text-neutral-900">{issueCountText(issueCount)}</span>
          <span className="tabular-nums">
            {pageNo} / {pageCount} ページ
          </span>
        </div>
      </div>

      <div className="flex border border-neutral-900">
        <SlipField label="得意先（客先担当）" value={customer} wide />
        <SlipField label="納入先" value={slip.destinationName} wide />
        <SlipField label="工事名" value={slip.projectName} wide />
      </div>
      <div className="flex border border-neutral-900">
        <SlipField label="営業担当" value={slip.salesRep} />
        <SlipField label="起案者" value={slip.staffName} />
        <SlipField label="加工場所" value={slip.siteName} />
        <SlipField label="部材区分" value={memberClass} />
        <SlipField label="受付No.（区分）" value={intake} />
        <SlipField label="受注日" value={formatDisplayDate(slip.orderDate)} />
      </div>
    </header>
  )
}
