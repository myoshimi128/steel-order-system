import { describe, expect, it } from 'vitest'
import { ADD_NOTE_MAX_LENGTH, addableIntakeError, validateAddWorkUnit } from './add-work-unit-form'

describe('addableIntakeError', () => {
  it('振り分け完了・完了の受付には追加できる', () => {
    expect(addableIntakeError('dispatched')).toBeNull()
    expect(addableIntakeError('closed')).toBeNull()
  })

  it('受付登録済（振り分け前）は振り分けの画面へ案内する', () => {
    expect(addableIntakeError('registered')).toContain('振り分けがまだ終わっていません')
  })

  it('それ以外は状態を出して断る', () => {
    expect(addableIntakeError('estimate')).toBe('この受付には追加できません（状態: 見積・ミルシート）')
  })
})

describe('validateAddWorkUnit', () => {
  const ok = { intakeStatus: 'dispatched' as const, origin: 'oversight' as const, kind: 'sakisun' as const, note: '' }

  it('受付・理由・区分がそろえばエラーなし（メモは任意）', () => {
    expect(validateAddWorkUnit(ok)).toEqual({})
  })

  it('受付を呼び出していない・理由・区分が空ならエラー', () => {
    expect(validateAddWorkUnit({ intakeStatus: null, origin: null, kind: null, note: '' })).toEqual({
      intakeNo: '受付No. を入力して呼び出してください',
      origin: '追加の理由を選んでください',
      kind: '区分を選んでください',
    })
  })

  it('振り分け前の受付はエラー', () => {
    expect(validateAddWorkUnit({ ...ok, intakeStatus: 'registered' }).intakeNo).toContain('振り分け')
  })

  it('「その他」はメモが必須（空白だけも不可）', () => {
    expect(validateAddWorkUnit({ ...ok, origin: 'other', note: '  ' }).note).toBeDefined()
    expect(validateAddWorkUnit({ ...ok, origin: 'other', note: '区分の誤り' })).toEqual({})
  })

  it('メモの文字数の上限', () => {
    expect(validateAddWorkUnit({ ...ok, note: 'あ'.repeat(ADD_NOTE_MAX_LENGTH + 1) }).note).toBeDefined()
  })
})
