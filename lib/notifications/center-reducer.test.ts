import { describe, expect, it } from 'vitest'
import { MAX_TOASTS, notificationCenterReducer, type NotificationCenterState } from './center-reducer'
import type { NotificationItem } from './types'

const item = (id: string, minute = 0): NotificationItem => ({
  id,
  kind: 'intake_new',
  intakeId: null,
  title: '新しいメールが届きました',
  body: null,
  createdAt: `2026-10-19T00:${String(minute).padStart(2, '0')}:00Z`,
})

const initial: NotificationCenterState = { unread: [item('a', 1)], unreadCount: 5, toasts: [] }

describe('notificationCenterReducer', () => {
  it('新着: 一覧の先頭に足し、数を 1 増やし、お知らせを出す', () => {
    const next = notificationCenterReducer(initial, { type: 'received', item: item('b', 2) })
    expect(next.unread.map((n) => n.id)).toEqual(['b', 'a'])
    expect(next.unreadCount).toBe(6)
    expect(next.toasts.map((n) => n.id)).toEqual(['b'])
  })

  it('同じ新着が 2 回届いても増やさない', () => {
    expect(notificationCenterReducer(initial, { type: 'received', item: item('a', 1) })).toBe(initial)
  })

  it('お知らせは古いものから消して上限までにする', () => {
    let state = initial
    for (let i = 0; i < MAX_TOASTS + 1; i++) {
      state = notificationCenterReducer(state, { type: 'received', item: item(`n${i}`, 10 + i) })
    }
    expect(state.toasts.map((n) => n.id)).toEqual(['n1', 'n2', 'n3'])
  })

  it('1 件を既読: 一覧とお知らせから外し、数を 1 減らす', () => {
    const shown = notificationCenterReducer(initial, { type: 'received', item: item('b', 2) })
    const next = notificationCenterReducer(shown, { type: 'markedRead', id: 'b' })
    expect(next.unread.map((n) => n.id)).toEqual(['a'])
    expect(next.unreadCount).toBe(5)
    expect(next.toasts).toEqual([])
  })

  it('既読にできなかったら、日時の順で一覧に戻す', () => {
    const state: NotificationCenterState = {
      unread: [item('c', 3), item('a', 1)],
      unreadCount: 2,
      toasts: [],
    }
    const next = notificationCenterReducer(state, { type: 'unmarked', item: item('b', 2) })
    expect(next.unread.map((n) => n.id)).toEqual(['c', 'b', 'a'])
    expect(next.unreadCount).toBe(3)
  })

  it('すべて既読: 空にする', () => {
    expect(notificationCenterReducer(initial, { type: 'markedAllRead' })).toEqual({
      unread: [],
      unreadCount: 0,
      toasts: [],
    })
  })

  it('受付の通知をまとめて既読: 一覧とお知らせから外し、数を件数分減らす', () => {
    const state: NotificationCenterState = { unread: [item('b', 2), item('a', 1)], unreadCount: 5, toasts: [item('b', 2)] }
    const next = notificationCenterReducer(state, { type: 'markedManyRead', ids: ['b', 'old'] })
    expect(next.unread.map((n) => n.id)).toEqual(['a'])
    expect(next.unreadCount).toBe(3)
    expect(next.toasts).toEqual([])
  })

  it('受付の通知をまとめて既読: 0 件なら変えない', () => {
    expect(notificationCenterReducer(initial, { type: 'markedManyRead', ids: [] })).toBe(initial)
  })
})
