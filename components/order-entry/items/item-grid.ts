// 明細の列の幅（見出しと各行で同じ並びにするため、ここで 1 か所にまとめる）。
//   No / 切断方法・区分 / 種類・製鋼法 / 材質・メーカー / 品名・寸法（残りの幅すべて）/
//   数量・重量 / 仕入単価・仕入金額 / 摘要
// Tailwind は文字列をそのままクラス名として読み取るため、クラス名は分割せずに書く。
export const ITEM_GRID_CLASS =
  'grid grid-cols-[2.5rem_8.5rem_7.5rem_9.5rem_minmax(0,1fr)_6.5rem_8rem_10rem] gap-x-2'
