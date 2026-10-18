'use client'

// 「工程ごとの目安納期」の区画（docs/intake/screen-design.md「S-03 納期連絡」）。
// 工程ごとに目安日数（営業日・整数）・混雑度・補足（ホームには出さない）を入れる。工程の追加・並べ替えもここで行う。
// 工程の削除・非表示はできない（必要になったら追加する）。

import { Icon } from '@/components/layout/icon'
import { Panel } from '@/components/layout/panel'
import type { LeadTimeEditorState } from '@/lib/lead-time/use-lead-time-editor'
import { LeadTimeItemRow } from './lead-time-item-row'

type LeadTimeItemTableProps = {
  editor: LeadTimeEditorState
  editable: boolean
}

export function LeadTimeItemTable({ editor, editable }: LeadTimeItemTableProps) {
  const { items } = editor.draft

  return (
    <Panel
      title="工程ごとの目安納期"
      aside={
        editable && (
          <button
            type="button"
            onClick={() => editor.addItem()}
            className="flex items-center gap-1 rounded px-2 py-1 text-sm text-navy hover:bg-navy-soft"
          >
            <Icon name="plus" className="h-4 w-4" />
            工程を追加
          </button>
        )
      }
    >
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[132px]" />
          <col className="w-[104px]" />
          <col className="w-[236px]" />
          <col />
          {editable && <col className="w-[64px]" />}
        </colgroup>
        <thead>
          <tr className="border-b border-line bg-canvas/60 text-left text-xs font-semibold text-neutral-500">
            <th className="py-2 pl-4 pr-2">工程</th>
            <th className="px-2 py-2">目安納期</th>
            <th className="px-2 py-2">混雑度</th>
            <th className="px-2 py-2">補足（ホームには表示しない）</th>
            {editable && (
              <th className="py-2 pl-1 pr-3">
                <span className="sr-only">並べ替え</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <LeadTimeItemRow
              key={item.key}
              item={item}
              error={editor.itemErrors[item.key]}
              editable={editable}
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onDaysChange={(text) => editor.setItemDays(item.key, text)}
              onCongestionChange={(value) => editor.setItemCongestion(item.key, value)}
              onNoteChange={(text) => editor.setItemNote(item.key, text)}
              onNameChange={(text) => editor.setItemName(item.key, text)}
              onRemove={() => editor.removeNewItem(item.key)}
              onMove={(direction) => editor.moveItem(item.key, direction)}
            />
          ))}
        </tbody>
      </table>

      <p className="border-t border-line px-4 py-2.5 text-xs text-neutral-500">
        「要相談」を選ぶと、ホームでは日数の代わりに「—」と「要相談」を表示します。
      </p>
    </Panel>
  )
}
