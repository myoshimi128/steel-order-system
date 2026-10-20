import { describe, expect, it } from 'vitest'
import { notificationHref } from './link'

describe('notificationHref', () => {
  it('受付の新着は、受付待ち一覧でその行を選んだ状態', () => {
    expect(notificationHref({ kind: 'intake_new', intakeId: 'abc' })).toBe('/intake?selected=abc')
  })

  it('受付のない通知・ほかの種類は移動しない', () => {
    expect(notificationHref({ kind: 'intake_new', intakeId: null })).toBeNull()
    expect(notificationHref({ kind: 'other', intakeId: 'abc' })).toBeNull()
  })
})
