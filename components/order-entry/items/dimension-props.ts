// 寸法の入力欄の部品（rectangle-dimensions.tsx など）で共通に受け取る props の型。

import type { Ref } from 'react'
import type { ItemErrors, ItemFieldName, ItemRowValues } from '@/lib/order-entry/item-types'

// 入力順の管理（useFieldNavigation）から受け取る、欄ごとの props
export type NavigationFieldProps = {
  id: string
  inputRef: Ref<HTMLInputElement>
  onNext: () => void
  onPrevious: () => void
}

export type DimensionInputProps = {
  row: ItemRowValues
  errors: ItemErrors
  // 欄の名前から、入力順の管理用の props を作る
  fieldProps: (field: ItemFieldName) => NavigationFieldProps
  onChange: (field: ItemFieldName, value: string) => void
}
