// 現場用伝票（加工指示書）の印刷に使う型（docs/screen-design.md「現場用伝票の印刷」）。
//
// DB から読んだ受注（load-order-slip.ts）を、この形にそろえてから伝票の行を組み立てる（slip-lines.ts）。
// マスタの名前（材質・種類・特殊製品など）は、読むときに受注の明細に結び付けておく。
// 品名・寸法・重量・加工の文は保存しておらず、印刷のときに組み立てる（同じ内容を 2 か所に持たないため）。

// 加工の行（order_item_processes）
export type SlipProcessSource = {
  lineNo: number
  processTypeName: string
  // 自由入力の形の加工内容（項目で入力する形は NULL）
  spec: string | null
  // 入力の形ごとの項目（{"shape": "穴", "holes_per_piece": 12, "hole_diameter": 38} など）
  specFields: Record<string, unknown> | null
  quantity: number | null
}

// 材料の行（order_items）
export type SlipItemSource = {
  lineNo: number
  // シャーリング / ガス / プラズマ / レーザー。定尺売りは NULL
  cuttingMethod: string | null
  // 寸法切 / アイトレ。定尺売り・特殊製品（スプライス以外）は NULL
  cuttingType: string | null
  plateTypeNumber: number
  plateTypeName: string
  // 無規格（ボンデ・ミガキ）は NULL
  materialName: string | null
  // 材質の製鋼法の初期値。明細の製鋼法がこれと違うときだけ品名に出す
  materialDefaultSteelMaking: string | null
  // 材質ライン（青2本 など）と伝票での表示色。基本材質（SS400）は NULL
  lineMark: string | null
  displayColor: string | null
  thickness: number
  // 電炉材 / 高炉材。製鋼法を入力しない行（定尺売り・縞板など）は NULL
  steelMaking: string | null
  manufacturerName: string | null
  // 特殊製品（ササラ・ベタ丸・ドーナツ・スプライス）のときの種別
  specialProduct: {
    name: string
    // スプライス専用の受注の明細の種別か（区分の名前は切断区分で出す）
    isSpliceOrderType: boolean
  } | null
  plateSize: string | null
  width: number | null
  length: number | null
  outerDiameter: number | null
  innerDiameter: number | null
  quantity: number
  // 1 枚あたりの重量（保存した値）
  squareWeight: number | null
  actualWeight: number | null
  materialWeight: number | null
  processes: SlipProcessSource[]
}

// 伝票の 1 行。材料の行と、その下にぶら下がる加工の行
export type SlipMaterialLine = {
  kind: 'material'
  lineNo: number
  // 切断方法の列（定尺売りは空）
  cuttingMethod: string
  // 品名と寸法（例: SN490C 寸法切 40 X 660 X 660（メーカー指定））
  productName: string
  thickness: number
  quantity: number
  // 伝票に載せる合計重量（kg）。保存した重量がなければ null
  weight: number | null
  // 材質ライン。登録がなければ null
  lineMark: { text: string; color: string | null } | null
  // 前の材料の行と板厚が違う（この行の上に太い区切り線を引く）
  thicknessBreak: boolean
}

export type SlipProcessLine = {
  kind: 'process'
  // 母材（材料の行）の行番号
  parentLineNo: number
  // 加工方法と加工内容（例: キリ孔 1S/ 12孔 38φ）
  text: string
  quantity: number | null
}

export type SlipLine = SlipMaterialLine | SlipProcessLine
