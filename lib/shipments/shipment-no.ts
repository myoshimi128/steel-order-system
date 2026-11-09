// 送り状No. の組み立て・入力の正規化と、送り状の画面の URL（docs/table-design.md「送り状の番号」）。
//
// 送り状No. は {受注No.}-{回数 2 桁}（例: 26-0001-1-01、分納の 2 回目は 26-0001-1-02）。
// 送り状は受注にぶら下がる書類なので、受注No. につなげる（採番は DB の関数 create_shipment の中）。
// 打ち方がそろわなくても同じ送り状を指せるよう、受注No. と同じ決まりでそろえる（lib/order-entry/order-no.ts）。
//   26-0001-1-01 → 26-0001-1-01（そのまま）
//   26 1 1 1     → 26-0001-1-01（空白で区切ってもよい。受付No. の連番は 0 を埋め、回数は 2 桁にする）
//   260001-1-1   → 26-0001-1-01（受付No. の部分はハイフンなしでもよい）
// 最後の区切りより後ろを回数、前を受注No. とみなす。区切りのない打ち方は、境目が決まらないため受け付けない（null）。

import { normalizeOrderNo } from '@/lib/order-entry/order-no'

// 回数を 2 桁にそろえる（100 回目からは桁を増やす。DB の private.issue_shipment_no と同じ）
export function formatShipmentNo(orderNo: string, seq: number): string {
  return `${orderNo}-${String(seq).padStart(2, '0')}`
}

// 送り状No. を受注No. と回数に分ける。形にならなければ null
export function parseShipmentNo(input: string): { orderNo: string; seq: number } | null {
  const match = /^(.+?)[-\s]+(\d+)$/.exec(input.trim())
  if (!match) return null
  const orderNo = normalizeOrderNo(match[1])
  if (!orderNo) return null
  const seq = Number(match[2])
  if (!Number.isInteger(seq) || seq < 1) return null
  return { orderNo, seq }
}

// 打った送り状No. を 26-0001-1-01 の形にそろえる。形にならなければ null
export function normalizeShipmentNo(input: string): string | null {
  const parsed = parseShipmentNo(input)
  return parsed ? formatShipmentNo(parsed.orderNo, parsed.seq) : null
}

// ------------------------------------------------------------
// 画面の URL
// ------------------------------------------------------------

// 送り状発行の入口（受注No.・送り状No. で呼び出す欄と、送り状を作れる受注の一覧）。
//   site: 加工場所のタブ（営業所のコード）。notice・no: 取り消しの結果のお知らせ
export type ShipmentsNotice = 'deleted'

export function shipmentsHref(params: { site?: string; notice?: ShipmentsNotice; no?: string } = {}): string {
  const search = new URLSearchParams()
  if (params.site) search.set('site', params.site)
  if (params.notice) search.set('notice', params.notice)
  if (params.no) search.set('no', params.no)
  const query = search.toString()
  return query === '' ? '/shipments' : `/shipments?${query}`
}

// 送り状の入力（この受注の送り状を作る）
export function shipmentNewHref(orderNo: string): string {
  return `/shipments/new?${new URLSearchParams({ order: orderNo }).toString()}`
}

// 発行した送り状（中身の確認・印刷し直し・取り消し）。issued は発行した直後の印（お知らせを出す）
export function shipmentViewHref(shipmentNo: string, issued = false): string {
  const search = new URLSearchParams({ no: shipmentNo })
  if (issued) search.set('issued', '1')
  return `/shipments/view?${search.toString()}`
}

// 送り状の印刷（4 部）。auto を付けると、開いたらすぐに印刷する（発行の直後に開くとき）
export function shipmentPrintHref(params: { no: string; auto?: boolean }): string {
  const search = new URLSearchParams({ no: params.no })
  if (params.auto) search.set('auto', '1')
  return `/shipments/print?${search.toString()}`
}

// 取り消しの結果のお知らせの文。知らない値なら null
export function shipmentsNoticeText(
  notice: string | string[] | undefined,
  no: string | string[] | undefined
): string | null {
  const label = typeof no === 'string' && no !== '' ? `送り状No. ${no} ` : ''
  if (notice === 'deleted') return `${label}を取り消しました`
  return null
}
