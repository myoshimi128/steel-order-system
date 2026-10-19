'use client'

// 受付の入れ先（複数。docs/intake/screen-design.md「入れ先（受付）」、画面イメージ 04c の「納入先」）。
//   ・行ごとに番号の欄を 1 つ置き、納入先マスタのコードを打つ（0 は売り先と同じ）。初期状態は「0 売り先と同じ」の 1 行
//   ・「＋入れ先を追加」で行を増やす。× で行を消す（最後の 1 行は消せない）。並び順のまま保存する
//   ・同じ入れ先を 2 行入れると、保存のときにエラーにする
// 行の追加・削除のボタンはマウスで押す（テンキーの入力の流れには入れない）。

import { CodeField } from '@/components/code-input/code-field'
import { Icon } from '@/components/layout/icon'
import type { CodeOption } from '@/lib/code-input/code-option'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import type { FieldNavigation } from '@/lib/hooks/use-field-navigation'
import { destinationFieldId } from '@/lib/intake/intake-form'
import type { IntakeFormState } from '@/lib/intake/use-intake-form'

type DestinationRowsProps = {
  form: IntakeFormState
  navigation: FieldNavigation
  options: readonly CodeOption<string>[]
}

export function DestinationRows({ form, navigation, options }: DestinationRowsProps) {
  return (
    <div className="flex flex-col gap-2">
      {form.destinationCodes.map((code, index) => {
        const id = destinationFieldId(index)
        return (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas text-xs font-semibold text-neutral-600">
              {index + 1}
            </span>
            <CodeField
              {...navigation.fieldProps(id)}
              listTitle="入れ先"
              options={options}
              maxLength={CODE_LENGTHS.destination}
              searchable
              code={code}
              onCodeChange={(value) => form.setDestination(index, value)}
              error={form.errors[id]}
              codeWidthClass="w-20"
              nameWidthClass="w-80"
            />
            {form.destinationCodes.length > 1 && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => form.removeDestination(index)}
                className="mt-1 rounded p-1.5 text-neutral-400 hover:bg-canvas hover:text-neutral-700"
              >
                <Icon name="x" className="h-4 w-4" />
                <span className="sr-only">入れ先 {index + 1} を消す</span>
              </button>
            )}
          </div>
        )
      })}
      {form.canAddDestination && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            const added = form.addDestination()
            // 足した行の欄へカーソルを移す（欄は画面の更新後に出るため、更新を待ってから移る）
            if (added) navigation.focusFieldLater(added)
          }}
          className="flex items-center justify-center gap-1.5 rounded border border-dashed border-line py-2 text-sm font-semibold text-neutral-700 hover:bg-canvas"
        >
          <Icon name="plus" className="h-4 w-4" />
          入れ先を追加
        </button>
      )}
    </div>
  )
}
