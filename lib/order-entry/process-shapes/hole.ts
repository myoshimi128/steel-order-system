// 入力の形「穴」（レーザー・プラズマ孔・ガス孔・キリ孔）の項目。
//
//   画面: 1S/ [孔数]孔 [穴径]φ    ← 伝票の表記どおりに並べ、左から順に入力する
//   数量: 1 枚あたりの孔数 × 母材の枚数（「1S/」は 1 枚あたりの意味）
//   保存: {"shape": "穴", "holes_per_piece": 12, "hole_diameter": 38}
//
// 将来の単価の自動計算では、板厚（母材）と穴径の区分で単価を決める（docs/basic-design.md「加工の入力項目」）。

import type { ItemErrors, ItemFieldName, ItemRowValues } from '../item-types'
import { parsePositiveNumber, parseQuantity } from '../resolve-item'
import type { HoleSpec, ProcessSpecCheck } from './types'

// 入力順: 孔数 → 穴径
export const HOLE_FIELDS: readonly ItemFieldName[] = ['holesPerPiece', 'holeDiameter']

export function checkHoleSpec(row: ItemRowValues): ProcessSpecCheck<HoleSpec> {
  const errors: ItemErrors = {}
  const liveErrors: ItemErrors = {}

  const holesPerPiece = parseQuantity(row.holesPerPiece)
  if (!row.holesPerPiece.trim()) {
    errors.holesPerPiece = '1 枚あたりの孔数を入力してください'
  } else if (holesPerPiece === null) {
    liveErrors.holesPerPiece = '孔数は 1 以上の整数で入力してください'
  }

  const holeDiameter = parsePositiveNumber(row.holeDiameter)
  if (!row.holeDiameter.trim()) {
    errors.holeDiameter = '穴径を入力してください'
  } else if (holeDiameter === null) {
    liveErrors.holeDiameter = '穴径は正の数で入力してください'
  }

  const spec: HoleSpec | null =
    holesPerPiece !== null && holeDiameter !== null
      ? { shape: '穴', holesPerPiece, holeDiameter }
      : null
  return { spec, errors, liveErrors }
}

// 伝票に載せる文。例: 1S/ 12孔 38φ
export function formatHoleSpec(spec: HoleSpec): string {
  return `1S/ ${spec.holesPerPiece}孔 ${spec.holeDiameter}φ`
}

// 保存用の JSON（order_item_processes.spec_fields）
export function holeSpecFields(spec: HoleSpec) {
  return {
    shape: spec.shape,
    holes_per_piece: spec.holesPerPiece,
    hole_diameter: spec.holeDiameter,
  }
}
