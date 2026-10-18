import { describe, expect, it } from 'vitest'
import { boardToDraft, draftToPreviewItems, validateDraft, type LeadTimeDraft } from './draft'
import type { LeadTimeBoard } from './types'

const board: LeadTimeBoard = {
  dept: 'shearing',
  items: [
    { id: 'a', name: 'レーザー', days: 2, congestion: 'normal', note: null },
    { id: 'b', name: 'プラズマ', days: null, congestion: 'consult', note: '要確認' },
  ],
  message: null,
  expiresOn: null,
  updatedAt: null,
  updatedByName: null,
}

describe('boardToDraft', () => {
  it('数値は欄の文字に、空は空文字にする', () => {
    expect(boardToDraft(board)).toEqual({
      items: [
        { key: 'a', id: 'a', name: 'レーザー', days: '2', congestion: 'normal', note: '' },
        { key: 'b', id: 'b', name: 'プラズマ', days: '', congestion: 'consult', note: '要確認' },
      ],
      message: '',
      expiresOn: '',
    })
  })
})

describe('validateDraft', () => {
  const draft = (edit: (d: LeadTimeDraft) => void = () => {}): LeadTimeDraft => {
    const d = boardToDraft(board)
    edit(d)
    return d
  }

  it('正しい入力は公開する内容に直す（要相談は日数なし、空は null）', () => {
    const result = validateDraft(
      draft((d) => {
        d.items[0].note = ' 12mm以上は+1日 '
        d.message = ' 点検で停止します '
        d.expiresOn = '2026-10-20'
      })
    )
    expect(result).toEqual({
      ok: true,
      value: {
        items: [
          { id: 'a', name: 'レーザー', days: 2, congestion: 'normal', note: '12mm以上は+1日' },
          { id: 'b', name: 'プラズマ', days: null, congestion: 'consult', note: '要確認' },
        ],
        message: '点検で停止します',
        expiresOn: '2026-10-20',
      },
    })
  })

  it('メッセージが空なら表示期限も空にする', () => {
    const result = validateDraft(draft((d) => (d.expiresOn = '2026-10-20')))
    expect(result.ok && result.value.expiresOn).toBeNull()
  })

  it('日数の未入力・範囲外・数字以外はエラー（要相談は確かめない）', () => {
    const empty = validateDraft(draft((d) => (d.items[0].days = '')))
    expect(empty.ok).toBe(false)
    expect(!empty.ok && empty.errors.a).toContain('目安日数を入れてください')

    expect(validateDraft(draft((d) => (d.items[0].days = '100'))).ok).toBe(false)
    expect(validateDraft(draft((d) => (d.items[0].days = '1.5'))).ok).toBe(false)
    expect(validateDraft(draft((d) => (d.items[0].days = '0'))).ok).toBe(true)
  })

  it('追加した工程の名前が空・重複ならエラー', () => {
    const add = (name: string) =>
      validateDraft(
        draft((d) =>
          d.items.push({ key: 'new-1', id: null, name, days: '3', congestion: 'normal', note: '' })
        )
      )
    const blank = add('  ')
    expect(!blank.ok && blank.errors['new-1']).toBe('工程の名前を入れてください')
    const dup = add('レーザー')
    expect(!dup.ok && dup.errors['new-1']).toBe('「レーザー」が 2 つあります')
  })

  it('メッセージが長すぎるとエラー', () => {
    const result = validateDraft(draft((d) => (d.message = 'あ'.repeat(201))))
    expect(!result.ok && result.messageError).toContain('200 文字以内')
  })
})

describe('draftToPreviewItems', () => {
  it('正しくない日数は null、空の名前は仮の名前にする', () => {
    const d = boardToDraft(board)
    d.items[0].days = 'x'
    d.items[0].name = ''
    expect(draftToPreviewItems(d)[0]).toEqual({
      id: 'a',
      name: '（名前なし）',
      days: null,
      congestion: 'normal',
      note: null,
    })
  })
})
