'use client'

// 至急の欄（受付登録・受注情報で共通）。チェック欄ではなく番号の欄で入れる（0 通常 / 1 至急。初期値 0）。
// テンキーから手を離さずに入力できるようにするため（部材区分 SPL・ショットを番号の欄にしたのと同じ考え方）。
// 1 至急のときは、欄の枠と名称を赤くして目立たせる（赤は至急・要相談・重要・必須だけに使う）。

import { CodeField } from '@/components/code-input/code-field'
import { CODE_LENGTHS } from '@/lib/code-lengths'
import { findCodeOption } from '@/lib/code-input/code-option'
import { URGENT_OPTIONS } from '@/lib/intake/constants'
import type { NavigationFieldProps } from '@/components/order-entry/items/dimension-props'

type UrgentFieldProps = NavigationFieldProps & {
  code: string
  onCodeChange: (code: string) => void
  error?: string
  // 1 至急のときに右に出す案内（受付登録と受注情報で違う）
  urgentNote?: string
}

export function UrgentField({
  code,
  onCodeChange,
  error,
  urgentNote = '受注登録待ち・CAD の先頭に並びます',
  ...navigation
}: UrgentFieldProps) {
  const urgent = findCodeOption(URGENT_OPTIONS, code)?.value === true
  return (
    <div
      className={`flex items-start gap-3 rounded border px-3 py-2 ${
        urgent ? 'border-urgent bg-urgent/5 text-urgent' : 'border-transparent'
      }`}
    >
      <CodeField
        {...navigation}
        listTitle="至急"
        options={URGENT_OPTIONS}
        maxLength={CODE_LENGTHS.urgent}
        code={code}
        onCodeChange={onCodeChange}
        error={error}
        codeWidthClass="w-10"
        nameWidthClass="w-12"
      />
      <span className={`mt-2 text-xs ${urgent ? 'font-bold' : 'text-neutral-400'}`}>
        {urgent ? urgentNote : '1 で至急'}
      </span>
    </div>
  )
}
