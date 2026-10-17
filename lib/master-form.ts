// マスタ管理画面のフォームの値を読み取る共通処理（任意の項目・数値の項目）。
// 注意事項・加工の注意事項のように、空欄を許す項目が多いマスタで使う。

export type ParsedValue<T> = { ok: true; value: T } | { ok: false; error: string }

// 任意の文字（空欄なら null）
export function readOptionalText(formData: FormData, name: string): string | null {
  const raw = formData.get(name)
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

// 任意の正の数（小数可。空欄なら null）。label はエラーの文に使う項目名
export function readOptionalPositiveNumber(
  formData: FormData,
  name: string,
  label: string,
): ParsedValue<number | null> {
  const text = readOptionalText(formData, name)
  if (text === null) {
    return { ok: true, value: null }
  }
  if (!/^\d+(\.\d+)?$/.test(text) || Number(text) <= 0) {
    return { ok: false, error: `${label}は正の数で入力してください` }
  }
  return { ok: true, value: Number(text) }
}

// 範囲（下限・上限。どちらも任意）を読み取る。両方あるときは 下限 ≤ 上限 であること
// （DB のチェック制約と同じ確認を先にして、どの項目が問題かを画面に示す）
export function readOptionalRange(
  formData: FormData,
  names: { min: string; max: string },
  label: string,
): ParsedValue<{ min: number | null; max: number | null }> {
  const min = readOptionalPositiveNumber(formData, names.min, `${label}の下限`)
  if (!min.ok) {
    return min
  }
  const max = readOptionalPositiveNumber(formData, names.max, `${label}の上限`)
  if (!max.ok) {
    return max
  }
  if (min.value !== null && max.value !== null && min.value > max.value) {
    return { ok: false, error: `${label}の下限は上限以下にしてください` }
  }
  return { ok: true, value: { min: min.value, max: max.value } }
}

// 整数（空欄なら既定値）。表示順など
export function readInteger(
  formData: FormData,
  name: string,
  label: string,
  defaultValue: number,
): ParsedValue<number> {
  const text = readOptionalText(formData, name)
  if (text === null) {
    return { ok: true, value: defaultValue }
  }
  if (!/^-?\d+$/.test(text)) {
    return { ok: false, error: `${label}は整数で入力してください` }
  }
  return { ok: true, value: Number(text) }
}
