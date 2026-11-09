// 送り状の印刷の画面を新しいタブで開く（発行の直後と、確認の画面の「印刷し直す」）。
//
// 発行では、保存が終わってから新しいタブを開くと、ブラウザがポップアップとして止めることがある。
// 現場用伝票（lib/order-slip/print-tab.ts）と同じく、ボタンを押した時点で空のタブを先に開いておき、
// 発行できたらそのタブで印刷の画面を開く。発行できなかったら、先に開いたタブは閉じる。
// ブラウザの中だけで使う（window を使う）。

import { shipmentPrintHref } from './shipment-no'

// 空のタブを開く。ブラウザに止められたら null
export function openBlankShipmentTab(): Window | null {
  const tab = window.open('', '_blank')
  if (tab) {
    tab.document.title = '送り状を準備しています'
    if (tab.document.body) tab.document.body.textContent = '送り状を準備しています…'
  }
  return tab
}

// 開いておいたタブで、印刷の画面を開く（開いたらすぐに印刷する）
export function showShipmentInTab(tab: Window, shipmentNo: string) {
  tab.location.href = shipmentPrintHref({ no: shipmentNo, auto: true })
}

// 新しいタブで印刷の画面を開く（ボタンを押した直後に呼ぶ）。止められたら false
export function openShipmentPrintTab(shipmentNo: string, auto = false): boolean {
  return window.open(shipmentPrintHref({ no: shipmentNo, auto }), '_blank') !== null
}
