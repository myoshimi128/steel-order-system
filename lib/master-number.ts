// マスタ管理画面の「番号」「コード」の入力を扱う共通処理。
//
// 受注登録画面ではテンキーだけで入力できるよう、マスタを番号（number 列）や
// 数字だけのコード（得意先・納入先の code）で選ぶ（docs/screen-design.md「入力方式」）。
// 各マスタの Server Action で同じ検証を書かないよう、ここにまとめる。

// 数字だけの文字列か（先頭から末尾まで 0〜9 のみ。空文字は false）
export function isDigitsOnly(value: string): boolean {
  return /^[0-9]+$/.test(value)
}

export type ParsedMasterNumber =
  | { ok: true; value: number }
  | { ok: false; error: string }

// フォームの number 欄を読み取り、0 以上の整数として返す。
// 番号はマスタ画面では必須とする（加工種別も DB 上は NULL 可だが、画面では必須）。
export function readMasterNumber(formData: FormData): ParsedMasterNumber {
  const raw = formData.get('number')

  if (typeof raw !== 'string' || !raw.trim()) {
    return { ok: false, error: '番号を入力してください' }
  }
  const trimmed = raw.trim()
  if (!isDigitsOnly(trimmed)) {
    return { ok: false, error: '番号は 0 以上の整数で入力してください' }
  }
  return { ok: true, value: Number(trimmed) }
}

// 特殊製品種別の番号として使えない値。
// 受注登録画面の「区分」の番号（1 寸法切 / 2 アイトレ / 3 定尺 / 9 加工）と重なると
// 区別できなくなるため（DB 側でも special_product_types_number_check で同じ制限をかけている）。
export const RESERVED_REGION_NUMBERS: readonly number[] = [1, 2, 3, 9]

// Supabase（PostgREST）のエラーのうち、判定に使う項目だけの型
type DbError = { code?: string; message?: string }

// 番号の一意制約（xxx_number_key）に違反したか。
// 一意制約違反のエラーコードは 23505 で、メッセージに制約名が含まれるため、
// 名前の一意制約（xxx_name_key）など他の一意制約と区別するのに使う。
export function isNumberUniqueViolation(error: DbError): boolean {
  return error.code === '23505' && (error.message ?? '').includes('_number_key')
}
