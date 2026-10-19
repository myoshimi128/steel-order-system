import { describe, expect, it } from 'vitest'
import { formatBadgeCount, formatRelativeTime, prependNotification } from './format'
import type { NotificationItem } from './types'

describe('formatBadgeCount', () => {
  it('10 件以上は 9+', () => {
    expect(formatBadgeCount(1)).toBe('1')
    expect(formatBadgeCount(9)).toBe('9')
    expect(formatBadgeCount(10)).toBe('9+')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-10-19T00:00:00Z')
  it('1 分未満・分・時間・1 日以上', () => {
    expect(formatRelativeTime('2026-10-18T23:59:30Z', now)).toBe('たった今')
    expect(formatRelativeTime('2026-10-18T23:57:00Z', now)).toBe('3分前')
    expect(formatRelativeTime('2026-10-18T22:00:00Z', now)).toBe('2時間前')
    // 日本時間の 10/16 08:15
    expect(formatRelativeTime('2026-10-15T23:15:00Z', now)).toBe('10/16 08:15')
  })
})

describe('prependNotification', () => {
  const item = (id: string): NotificationItem => ({
    id,
    kind: 'intake_new',
    intakeId: null,
    title: '新しいメールが届きました',
    body: null,
    createdAt: '2026-10-19T00:00:00Z',
  })

  it('先頭に足し、上限を超えた古いものを外す', () => {
    const result = prependNotification([item('b'), item('a')], item('c'), 2)
    expect(result.added).toBe(true)
    expect(result.list.map((n) => n.id)).toEqual(['c', 'b'])
  })

  it('同じ id が届いたら足さない', () => {
    const list = [item('a')]
    expect(prependNotification(list, item('a'), 20)).toEqual({ list, added: false })
  })
})
