import { describe, expect, it } from 'vitest'
import { buildLeadTimeSummary } from './summary'
import type { LeadTimeSnapshot } from './types'

const before: LeadTimeSnapshot = {
  items: [
    { id: 'a', name: 'レーザー', days: 3, congestion: 'normal', note: '12mm以上は+1日' },
    { id: 'b', name: 'プラズマ', days: 3, congestion: 'normal', note: null },
  ],
  message: '3号機は点検で停止します',
  expiresOn: '2026-10-20',
}

// before を写して、一部だけ変えたものを作る
function changed(edit: (s: LeadTimeSnapshot) => void): LeadTimeSnapshot {
  const copy: LeadTimeSnapshot = structuredClone(before)
  edit(copy)
  return copy
}

describe('buildLeadTimeSummary', () => {
  it('変更がなければ null', () => {
    expect(buildLeadTimeSummary(before, structuredClone(before))).toBeNull()
  })

  it('日数とメッセージの変更をつなげる', () => {
    const after = changed((s) => {
      s.items[0].days = 2
      s.message = '3号機は 10/17 午前に停止します'
    })
    expect(buildLeadTimeSummary(before, after)).toBe('レーザー 3→2営業日、メッセージを更新')
  })

  it('混雑度の変更', () => {
    const after = changed((s) => {
      s.items[1].congestion = 'busy'
    })
    expect(buildLeadTimeSummary(before, after)).toBe('プラズマを「やや混雑」に変更')
  })

  it('要相談にしたときは日数の変更として書かない', () => {
    const after = changed((s) => {
      s.items[1].congestion = 'consult'
      s.items[1].days = null
    })
    expect(buildLeadTimeSummary(before, after)).toBe('プラズマを「要相談」に変更')
  })

  it('要相談から戻したときは新しい日数を添える', () => {
    const consulted = changed((s) => {
      s.items[1].congestion = 'consult'
      s.items[1].days = null
    })
    const after = changed((s) => {
      s.items[1].days = 4
    })
    expect(buildLeadTimeSummary(consulted, after)).toBe('プラズマを「通常」に変更（4営業日）')
  })

  it('日数が未入力だったときは「—」', () => {
    const empty = changed((s) => {
      s.items[0].days = null
    })
    expect(buildLeadTimeSummary(empty, before)).toBe('レーザー —→3営業日')
  })

  it('補足・工程の追加・並び順', () => {
    const after = changed((s) => {
      s.items[0].note = null
      s.items.reverse()
      s.items.push({ id: null, name: '曲げ', days: 5, congestion: 'normal', note: null })
    })
    expect(buildLeadTimeSummary(before, after)).toBe(
      'レーザーの補足を更新、工程「曲げ」を追加、並び順を変更'
    )
  })

  it('メッセージの削除と、表示期限だけの変更', () => {
    expect(
      buildLeadTimeSummary(
        before,
        changed((s) => {
          s.message = null
          s.expiresOn = null
        })
      )
    ).toBe('メッセージを削除')
    expect(
      buildLeadTimeSummary(
        before,
        changed((s) => {
          s.expiresOn = '2026-10-31'
        })
      )
    ).toBe('表示期限を変更')
  })
})
