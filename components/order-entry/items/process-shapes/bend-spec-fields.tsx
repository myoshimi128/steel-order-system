'use client'

// 入力の形「曲げ」: [ヶ所] [曲げ方] 曲げ。
//   ヶ所  : 0 1ヶ所（初期値）/ 2〜4 / 9 フリー（右にヶ所数の欄が現れる）
//   曲げ方: 0 90°（初期値）/ 2 二方 / 3 三方 / 4 四方 / 9 フリー（右に文字の欄が現れる）
// 伝票の文は「〇ヶ所 〇曲げ」に統一するため、フリーの曲げ方は「曲げ」を除いた部分（R、85° など）を入力する。
// 入力する部分が分かるよう、曲げ方の欄（フリーなら文字の欄）の右に「曲げ」と表示する。

import { CodeField } from '@/components/code-input/code-field'
import { NumericField } from '@/components/code-input/numeric-field'
import { TextField } from '@/components/code-input/text-field'
import {
  BEND_COUNT_OPTIONS,
  BEND_STYLE_OPTIONS,
  FREE_INPUT_CODE,
} from '@/lib/order-entry/constants'
import type { DimensionInputProps } from '../dimension-props'

export function BendSpecFields({ row, errors, fieldProps, onChange }: DimensionInputProps) {
  const isFreeCount = row.bendCount.trim() === FREE_INPUT_CODE
  const isFreeStyle = row.bendStyle.trim() === FREE_INPUT_CODE

  return (
    <div className="flex items-center gap-1.5">
      {/* ヶ所 */}
      <CodeField
        {...fieldProps('bendCount')}
        listTitle="ヶ所"
        options={BEND_COUNT_OPTIONS}
        code={row.bendCount}
        onCodeChange={(code) => onChange('bendCount', code)}
        error={errors.bendCount}
        codeWidthClass="w-7"
        nameWidthClass={isFreeCount ? 'w-10' : 'w-12'}
        showErrorText={false}
      />
      {isFreeCount && (
        <>
          <NumericField
            {...fieldProps('bendCountFree')}
            value={row.bendCountFree}
            onValueChange={(value) => onChange('bendCountFree', value)}
            error={errors.bendCountFree}
            widthClass="w-10"
            showErrorText={false}
          />
          <span className="text-neutral-500 dark:text-neutral-400">ヶ所</span>
        </>
      )}

      {/* 曲げ方 */}
      <CodeField
        {...fieldProps('bendStyle')}
        listTitle="曲げ方"
        options={BEND_STYLE_OPTIONS}
        code={row.bendStyle}
        onCodeChange={(code) => onChange('bendStyle', code)}
        error={errors.bendStyle}
        codeWidthClass="w-7"
        nameWidthClass="w-10"
        showErrorText={false}
      />
      {isFreeStyle && (
        <TextField
          {...fieldProps('bendStyleFree')}
          value={row.bendStyleFree}
          onValueChange={(value) => onChange('bendStyleFree', value)}
          error={errors.bendStyleFree}
          widthClass="w-20"
          showErrorText={false}
        />
      )}
      <span className="text-neutral-500 dark:text-neutral-400">曲げ</span>
    </div>
  )
}
