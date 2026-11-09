// 送り状の画面と印刷に使う型（docs/screen-design.md「送り状発行」）。
//
// DB から読んだ受注・送り状（load-shipment-order.ts・load-shipment.ts）を、この形にそろえてから
// 数量・重量の計算（shipment-lines.ts）と表示に使う。品名と寸法・加工の文は、現場用伝票と同じ決まりで組み立てる
// （lib/order-slip/slip-lines.ts の productNameText・processText）。

// 送り状の入力の画面の、受注の明細 1 行
export type ShipmentOrderItem = {
  id: string
  lineNo: number
  // シャーリング / ガス など。定尺売りは空
  cuttingMethod: string
  // 品名と寸法（例: SS400 寸法切 9 X 300 X 600）
  productName: string
  // 加工の文（例: キリ孔 1S/ 12孔 38φ）。母材の行の下に出すだけで、単独では出荷しない
  processes: string[]
  orderedQuantity: number
  // 今までの送り状の数量の合計（取り消した送り状は含まない）
  shippedQuantity: number
  // 1 枚あたりの角重量（請求の根拠。ササラは使用材重量）。保存した重量がなければ null
  billingPieceWeight: number | null
  // 1 枚あたりの実重量（受注の明細に保存した値）。null の行（アイトレ・ササラ）は送り状の画面で入力する
  actualPieceWeight: number | null
  // 前回の送り状で入力した 1 枚あたりの実重量（分納の 2 回目以降の初期値）。なければ null
  lastInputPieceWeight: number | null
}

// 受注について発行済みの送り状（入力の画面の「この受注の送り状」）
export type ShipmentSummary = {
  id: string
  shipmentNo: string
  shippedDate: string
  // 今回の数量の合計（枚）
  totalQuantity: number
}

// 受注の上部の項目（入力の画面・確認の画面・印刷で共通）
export type ShipmentOrderHeader = {
  id: string
  orderNo: string
  status: string
  customerName: string
  customerContact: string | null
  // 入れ先の名前。売り先と同じ（NULL）なら売り先の名前
  destinationName: string
  destinationAddress: string | null
  projectName: string | null
  dueDateType: string
  dueDate: string | null
  deliveryMethodName: string
  deliveryMethodNote: string | null
  siteName: string | null
}

// 送り状を作る受注（入力の画面）
export type ShipmentOrder = ShipmentOrderHeader & {
  updatedAt: string
  deleted: boolean
  items: ShipmentOrderItem[]
  shipments: ShipmentSummary[]
}

// 発行済みの送り状の明細 1 行（確認の画面と印刷）
export type IssuedShipmentLine = {
  lineNo: number
  cuttingMethod: string
  productName: string
  processes: string[]
  quantity: number
  // 今回の数量の角重量の合計（請求の根拠）。保存した重量がなければ null
  squareWeight: number | null
  // 今回の数量の実重量の合計（shipment_items.weight）。アイトレ・ササラで入力しなかったら null
  actualWeight: number | null
}

// 発行済みの送り状（確認の画面と印刷）
export type IssuedShipment = {
  id: string
  shipmentNo: string
  shippedDate: string
  createdAt: string
  createdByName: string | null
  order: ShipmentOrderHeader
  lines: IssuedShipmentLine[]
}
