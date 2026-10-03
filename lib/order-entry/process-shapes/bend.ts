// 入力の形「曲げ」の項目。
//
//   画面: [ヶ所] [曲げ方] 曲げ
//         ヶ所が 9 フリーなら右にヶ所数の欄、曲げ方が 9 フリーなら右に文字の欄が現れる
//   数量: 母材の枚数（曲げは単価が重量で決まるため、材料と同じ枚数にする）
//   文  : 「〇ヶ所 〇曲げ」に統一し、曲げ方の後ろに常に「曲げ」を付ける
//         （1ヶ所 90°曲げ / 2ヶ所 二方曲げ / フリーで R と入力 → 1ヶ所 R曲げ）
//   保存: {"shape": "曲げ", "bend_count": 2, "bend_style": "二方", "bend_style_note": null}
//
// 将来の単価の自動計算では、ヶ所数と曲げ方（二方・三方・四方は追加料金）で単価を決める。
// 角度では単価が変わらないため、85° のような角度はフリーの文字として持つだけにしている。

import { findCodeOption } from '@/lib/code-input/code-option'
import { BEND_COUNT_OPTIONS, BEND_STYLE_OPTIONS, FREE_INPUT_CODE } from '../constants'
import type { ItemErrors, ItemFieldName, ItemRowValues } from '../item-types'
import { parseQuantity } from '../resolve-item'
import type { BendSpec, ProcessSpecCheck } from './types'

// 入力順: ヶ所（9 フリーならヶ所数）→ 曲げ方（9 フリーなら文字）
export function bendFields(row: ItemRowValues): ItemFieldName[] {
  const fields: ItemFieldName[] = ['bendCount']
  if (row.bendCount.trim() === FREE_INPUT_CODE) {
    fields.push('bendCountFree')
  }
  fields.push('bendStyle')
  if (row.bendStyle.trim() === FREE_INPUT_CODE) {
    fields.push('bendStyleFree')
  }
  return fields
}

export function checkBendSpec(row: ItemRowValues): ProcessSpecCheck<BendSpec> {
  const errors: ItemErrors = {}
  const liveErrors: ItemErrors = {}

  // --- ヶ所 ---
  let bendCount: number | null = null
  const countOption = findCodeOption(BEND_COUNT_OPTIONS, row.bendCount)
  if (!row.bendCount.trim()) {
    errors.bendCount = 'ヶ所を選択してください'
  } else if (!countOption) {
    liveErrors.bendCount = '存在しない番号です'
  } else if (countOption.value !== null) {
    bendCount = countOption.value
  } else {
    // 9 フリー: 右の欄に入力したヶ所数を使う
    bendCount = parseQuantity(row.bendCountFree)
    if (!row.bendCountFree.trim()) {
      errors.bendCountFree = 'ヶ所数を入力してください'
    } else if (bendCount === null) {
      liveErrors.bendCountFree = 'ヶ所数は 1 以上の整数で入力してください'
    }
  }

  // --- 曲げ方 ---
  const styleOption = findCodeOption(BEND_STYLE_OPTIONS, row.bendStyle)
  const note = row.bendStyleFree.trim()
  if (!row.bendStyle.trim()) {
    errors.bendStyle = '曲げ方を選択してください'
  } else if (!styleOption) {
    liveErrors.bendStyle = '存在しない番号です'
  } else if (styleOption.value === 'フリー' && !note) {
    errors.bendStyleFree = '曲げ方を入力してください（「曲げ」を除いた部分。R、85° など）'
  }

  const styleComplete = styleOption !== undefined && (styleOption.value !== 'フリー' || note !== '')
  const spec: BendSpec | null =
    bendCount !== null && styleOption && styleComplete
      ? {
          shape: '曲げ',
          bendCount,
          bendStyle: styleOption.value,
          // フリーのときだけ入力した文字を持つ（ほかの曲げ方では使わない）
          bendStyleNote: styleOption.value === 'フリー' ? note : null,
        }
      : null
  return { spec, errors, liveErrors }
}

// 伝票に載せる文。例: 1ヶ所 90°曲げ / 2ヶ所 二方曲げ / 1ヶ所 R曲げ
export function formatBendSpec(spec: BendSpec): string {
  const style = spec.bendStyle === 'フリー' ? (spec.bendStyleNote ?? '') : spec.bendStyle
  return `${spec.bendCount}ヶ所 ${style}曲げ`
}

// 保存用の JSON（order_item_processes.spec_fields）
export function bendSpecFields(spec: BendSpec) {
  return {
    shape: spec.shape,
    bend_count: spec.bendCount,
    bend_style: spec.bendStyle,
    bend_style_note: spec.bendStyleNote,
  }
}
