// 番号の欄の上限の桁数（docs/screen-design.md「番号の桁数と自動で次へ」）。
//
// 受注登録画面の番号の欄は、上限の桁まで打つと Enter を押さなくても次の欄へ進む（現行のシステムと同じ）。
// マスタのコード・番号もこの桁数に合わせ、マスタ管理の画面と DB の制約（check）で同じ桁数に制限する
// （supabase/migrations/20261017100200_restrict_code_digits.sql）。
//
// 「固定」のものは、マスタのコードを必ずその桁数にする（売り先 1001 など）。
// 定数で持つ選択肢（処理区分・製鋼法など）は 1 桁に収まる。

export const CODE_LENGTHS = {
  // --- ① 受注情報 ---
  processingType: 1, // 処理区分（0 新規 / 1 変更 / 2 削除）
  customer: 4, // 売り先（得意先コード。4 桁固定）
  dueDateType: 1, // 納期種別
  deliveryMethod: 1, // 配達（配達方法マスタの番号 0〜9）
  destination: 4, // 入れ先（納入先コード。4 桁固定。「0 売り先と同じ」だけは 1 桁）
  site: 1, // 加工場所（営業所の番号 1〜9）
  memberClass: 1, // 部材区分
  spliceShot: 1, // ショット
  // --- ② 注文内容 ---
  cutRegion: 2, // 切断・区分（2 桁。「9 加工」だけは 1 桁で加工の行に切り替わる）
  plateType: 1, // 種類（0〜9）
  material: 1, // 材質（0〜9。10 種類目が必要になったら 2 桁に広げる）
  steelMaking: 1, // 製鋼法
  manufacturer: 1, // メーカー（0 指定なし、1〜9 各メーカー。1 桁固定）
  plateSize: 1, // 定尺サイズ
  processType: 2, // 加工方法（加工種別の番号 10〜99。2 桁固定）
  bendCount: 1, // 曲げのヶ所
  bendStyle: 1, // 曲げ方
  stamp: 2, // スタンプの番号（1〜99。Enter で付け外しするため、桁がそろっても自動では進まない）
} as const

// 板厚の上限の桁数。小数点は数えず、数字の数で数える（16・40・1.6・4.5 は 2 桁、9 は 1 桁）
export const THICKNESS_MAX_DIGITS = 2

// マスタの番号（number 列）の範囲。DB の check 制約と同じ
export const MASTER_NUMBER_RANGES = {
  plateTypes: { min: 0, max: 9 },
  materials: { min: 0, max: 9 },
  specialProductTypes: { min: 0, max: 9 },
  processTypes: { min: 10, max: 99 },
  deliveryMethods: { min: 0, max: 9 },
  stamps: { min: 1, max: 99 },
} as const

// 数字の数（小数点などを除く）。板厚の桁数を数えるのに使う
export function countDigits(value: string): number {
  return value.replace(/[^0-9]/g, '').length
}

// 板厚が上限の桁数に収まるか（商品マスタの登録で使う。DB の products_thickness_digits_check と同じ）。
// 数値を文字にした形（1.6 → "1.6"、12 → "12"）の数字の数で数える。
// 収まるのは 0.1〜9.9（小数第 1 位まで）と 1〜99 の整数
export function isThicknessWithinDigits(thickness: number): boolean {
  return thickness > 0 && countDigits(String(thickness)) <= THICKNESS_MAX_DIGITS
}
