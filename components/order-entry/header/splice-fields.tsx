'use client'

// スプライス専用の受注のときだけ表示する「継手番号」と「ショット」の欄。
// ヘッダーの「スプライス」を 1 にすると表示される（docs/screen-design.md「スプライス専用の受注」）。

import { CodeField } from '@/components/code-input/code-field'
import { TextField } from '@/components/code-input/text-field'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { JOINT_NO_MAX_LENGTH, SHOT_OPTIONS } from '@/lib/order-entry/constants'
import type { OrderHeaderState } from '@/lib/order-entry/use-order-header'

type SpliceFieldsProps = {
  header: OrderHeaderState
  navigation: FieldNavigation
}

export function SpliceFields({ header, navigation }: SpliceFieldsProps) {
  return (
    <>
      <TextField
        {...navigation.fieldProps('jointNo')}
        label="継手番号"
        value={header.values.jointNo}
        onValueChange={(value) => header.setValue('jointNo', value)}
        error={header.errors.jointNo}
        maxLength={JOINT_NO_MAX_LENGTH}
        // 継手番号の上限（10 文字）が収まる幅
        widthClass="w-32"
      />
      <CodeField
        {...navigation.fieldProps('spliceShot')}
        label="ショット"
        options={SHOT_OPTIONS}
        code={header.values.spliceShot}
        onCodeChange={(code) => header.setValue('spliceShot', code)}
        error={header.errors.spliceShot}
        codeWidthClass="w-10"
        nameWidthClass="w-10"
      />
    </>
  )
}
