// 印刷の画面を新しいタブで開く（受注登録の「登録して現場用伝票を印刷」と、呼び出しの画面の「伝票を印刷」）。
//
// 登録では、保存が終わってから新しいタブを開くと、ブラウザがポップアップとして止めることがある
// （ボタンを押した直後でないと、新しいタブを開くことを許さないため）。そこで、ボタンを押した時点で
// 空のタブを先に開いておき（openBlankPrintTab）、登録できたらそのタブで印刷の画面を開く（showSlipInTab）。
// 登録できなかったら、先に開いたタブは閉じる。止められたとき（null）は、登録後の画面のボタンから開き直す。
// ブラウザの中だけで使う（window を使う）。

import { slipPrintHref } from './slip-format'

// 空のタブを開く。ブラウザに止められたら null
export function openBlankPrintTab(): Window | null {
  const tab = window.open('', '_blank')
  if (tab) {
    // 印刷の画面を開くまでの間に出す文
    // （開いたばかりのタブでは body がまだないこともあるため、あるときだけ書く）
    tab.document.title = '現場用伝票を準備しています'
    if (tab.document.body) tab.document.body.textContent = '現場用伝票を準備しています…'
  }
  return tab
}

// 開いておいたタブで、印刷の画面を開く（開いたらすぐに印刷する）
export function showSlipInTab(tab: Window, orderNo: string) {
  tab.location.href = slipPrintHref({ no: orderNo, auto: true })
}

// 新しいタブで印刷の画面を開く（ボタンを押した直後に呼ぶ）。止められたら false
export function openSlipPrintTab(orderNo: string, auto = false): boolean {
  return window.open(slipPrintHref({ no: orderNo, auto }), '_blank') !== null
}
