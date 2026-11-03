// 送り状の入力の画面の、明細の欄の ID（Enter で次へ進む順と、欄の登録に使う）。

export function quantityFieldId(itemId: string): string {
  return `qty-${itemId}`
}

export function weightFieldId(itemId: string): string {
  return `weight-${itemId}`
}
