import { describe, expect, it } from 'vitest'
import { buildOrderAuxPayload, validateOrderAux } from './order-aux'
import {
  checkedStampIds,
  designatedStampIds,
  findStampByCode,
  stampStates,
  toggleStamp,
  type StampMaster,
} from './stamps'

const STAMPS: StampMaster[] = [
  { id: 'stamp-rush', number: 2, body: '急ぎ' },
  { id: 'stamp-rain', number: 1, body: '雨濡れ厳禁' },
  { id: 'stamp-inspect', number: 3, body: '立会検査あり' },
]

// 得意先 customer-1 は「雨濡れ厳禁」を指定している
const CUSTOMER_STAMPS = [{ customer_id: 'customer-1', stamp_id: 'stamp-rain' }]

describe('stampStates（スタンプのチェックの状態）', () => {
  it('番号順に並べ、得意先の指定スタンプにチェックを入れる', () => {
    const states = stampStates(STAMPS, designatedStampIds(CUSTOMER_STAMPS, 'customer-1'), {})
    expect(states.map((state) => [state.stamp.number, state.checked, state.designated])).toEqual([
      [1, true, true],
      [2, false, false],
      [3, false, false],
    ])
  })

  it('得意先を選んでいなければ、指定スタンプのチェックは入らない', () => {
    const states = stampStates(STAMPS, designatedStampIds(CUSTOMER_STAMPS, null), {})
    expect(checkedStampIds(states)).toEqual([])
  })

  it('付け外しは今の状態を反転する。指定スタンプもその受注だけ外せる', () => {
    const designated = designatedStampIds(CUSTOMER_STAMPS, 'customer-1')
    let overrides = toggleStamp(stampStates(STAMPS, designated, {}), {}, 'stamp-rain')
    overrides = toggleStamp(stampStates(STAMPS, designated, overrides), overrides, 'stamp-rush')
    expect(checkedStampIds(stampStates(STAMPS, designated, overrides))).toEqual(['stamp-rush'])
  })

  it('得意先を変えても、手で付け外ししたものはそのまま残す', () => {
    const overrides = { 'stamp-inspect': true }
    const states = stampStates(STAMPS, designatedStampIds(CUSTOMER_STAMPS, 'customer-2'), overrides)
    expect(checkedStampIds(states)).toEqual(['stamp-inspect'])
  })
})

describe('findStampByCode（番号からスタンプを探す）', () => {
  it('番号で探す。存在しない番号・数字でないものは undefined', () => {
    expect(findStampByCode(STAMPS, ' 2 ')?.id).toBe('stamp-rush')
    expect(findStampByCode(STAMPS, '9')).toBeUndefined()
    expect(findStampByCode(STAMPS, 'a')).toBeUndefined()
  })
})

describe('validateOrderAux / buildOrderAuxPayload（スタンプ・フリーコメントの保存）', () => {
  it('選べるスタンプだけなら問題なし', () => {
    expect(validateOrderAux({ stampIds: ['stamp-rain'], fieldNote: '' }, STAMPS)).toBeNull()
  })

  it('存在しない・重複したスタンプはエラー', () => {
    expect(validateOrderAux({ stampIds: ['unknown'], fieldNote: '' }, STAMPS)).not.toBeNull()
    expect(validateOrderAux({ stampIds: ['stamp-rain', 'stamp-rain'], fieldNote: '' }, STAMPS)).not.toBeNull()
  })

  it('フリーコメントは前後の空白を除き、空なら NULL。改行はそのまま残す', () => {
    expect(buildOrderAuxPayload({ stampIds: [], fieldNote: '  ' })).toEqual({ field_note: null, stamp_ids: [] })
    expect(buildOrderAuxPayload({ stampIds: ['stamp-rain'], fieldNote: ' 急ぎで\n10/3 一部先出し ' })).toEqual({
      field_note: '急ぎで\n10/3 一部先出し',
      stamp_ids: ['stamp-rain'],
    })
  })
})
