// 受注No. の入力の正規化と、組み立て・分解（docs/table-design.md「受注番号の採番」）。
//
// 受注No. は {受付No.}-{枝番}（例: 26-1003-1）。処理区分 1 変更・2 削除で、受注No. をテンキーで打って呼び出す。
// 受注No. の欄では「-」をハイフンとして入力する（明細の「切断・区分」の欄の「-」は行番号の複写だが、
// それは番号の欄だけの操作で、受注No. の欄は文字の欄のため、「-」はそのまま文字として入る）。
// 打ち方がそろわなくても同じ受注を指せるよう、次の打ち方を YY-NNNN-B にそろえる。
//   26-1003-1  → 26-1003-1（そのまま）
//   26 1003 1  → 26-1003-1（空白で区切ってもよい）
//   26-1-1     → 26-0001-1（受付No. の連番は 0 を埋める。lib/intake/intake-no.ts と同じ）
//   26-1003-01 → 26-1003-1（枝番の先頭の 0 は外す）
//   261003-1   → 26-1003-1（受付No. の部分はハイフンなしでもよい。受付No. と同じ決まり）
// 区切りのない打ち方（2610031）は、受付No. と枝番の境目が決まらないため受け付けない（null を返す）。

import { normalizeIntakeNo } from '@/lib/intake/intake-no'

// 受注No. を組み立てる
export function formatOrderNo(intakeNo: string, branchNo: number): string {
  return `${intakeNo}-${branchNo}`
}

// 受注No. を受付No. と枝番に分ける。形にならなければ null
export function parseOrderNo(input: string): { intakeNo: string; branchNo: number } | null {
  const text = input.trim()
  // 最後の区切り（ハイフンか空白）より後ろを枝番、前を受付No. とみなす
  const match = /^(.+?)[-\s]+(\d+)$/.exec(text)
  if (!match) return null
  // 受付No. の部分は受付No. と同じ決まりでそろえる（261003 → 26-1003 も受け付ける）
  const intakeNo = normalizeIntakeNo(match[1])
  if (!intakeNo) return null
  const branchNo = Number(match[2])
  if (!Number.isInteger(branchNo) || branchNo < 1) return null
  return { intakeNo, branchNo }
}

// 打った受注No. を YY-NNNN-B にそろえる。形にならなければ null
export function normalizeOrderNo(input: string): string | null {
  const parsed = parseOrderNo(input)
  return parsed ? formatOrderNo(parsed.intakeNo, parsed.branchNo) : null
}

// 受注の呼び出し（処理区分 1 変更・2 削除）の画面の URL。
//   type: 1 変更（edit）/ 2 削除（delete）。no: 受注No.（呼び出す受注）。notice: 保存・削除の結果のお知らせ
export type OrderEditNotice = 'updated' | 'deleted'

export function orderEditHref(params: {
  type?: 'edit' | 'delete'
  no?: string | null
  notice?: OrderEditNotice
}): string {
  const search = new URLSearchParams()
  if (params.type) search.set('type', params.type === 'delete' ? '2' : '1')
  if (params.no) search.set('no', params.no)
  if (params.notice) search.set('notice', params.notice)
  const query = search.toString()
  return query === '' ? '/orders/edit' : `/orders/edit?${query}`
}

// URL の ?type= を処理区分にする（2 なら削除、それ以外は変更）
export function parseOrderEditType(value: string | string[] | undefined): 'edit' | 'delete' {
  return value === '2' ? 'delete' : 'edit'
}

// 保存・削除の結果のお知らせの文。知らない値なら null
export function orderEditNoticeText(
  notice: string | string[] | undefined,
  no: string | string[] | undefined
): string | null {
  const label = typeof no === 'string' && no !== '' ? `受注No. ${no} ` : ''
  if (notice === 'updated') return `${label}の変更を保存しました`
  if (notice === 'deleted') return `${label}を削除しました`
  return null
}
