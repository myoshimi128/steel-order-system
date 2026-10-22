import { describe, expect, it } from 'vitest'
import {
  formatOrderNo,
  normalizeOrderNo,
  orderEditHref,
  orderEditNoticeText,
  parseOrderEditType,
  parseOrderNo,
} from './order-no'

describe('normalizeOrderNo', () => {
  it('ハイフン区切りはそのまま', () => {
    expect(normalizeOrderNo('26-1003-1')).toBe('26-1003-1')
    expect(normalizeOrderNo(' 26-1003-12 ')).toBe('26-1003-12')
  })

  it('空白で区切ってもよい', () => {
    expect(normalizeOrderNo('26 1003 1')).toBe('26-1003-1')
    expect(normalizeOrderNo('26-1003 2')).toBe('26-1003-2')
  })

  it('受付No. の連番は 0 を埋め、枝番の先頭の 0 は外す', () => {
    expect(normalizeOrderNo('26-1-1')).toBe('26-0001-1')
    expect(normalizeOrderNo('26-1003-01')).toBe('26-1003-1')
  })

  it('受付No. の部分はハイフンなしでもよい（枝番の前の区切りは要る）', () => {
    expect(normalizeOrderNo('261003-1')).toBe('26-1003-1')
  })

  it('10000 件目以降の受付No. も扱える', () => {
    expect(normalizeOrderNo('26-10000-3')).toBe('26-10000-3')
  })

  it('区切りのない打ち方・枝番のない打ち方は受け付けない', () => {
    expect(normalizeOrderNo('2610031')).toBeNull()
    expect(normalizeOrderNo('26-1003')).toBeNull()
  })

  it('枝番 0・数字以外・空は受け付けない', () => {
    expect(normalizeOrderNo('26-1003-0')).toBeNull()
    expect(normalizeOrderNo('26-1003-A')).toBeNull()
    expect(normalizeOrderNo('')).toBeNull()
  })
})

describe('parseOrderNo / formatOrderNo', () => {
  it('受付No. と枝番に分け、組み立て直せる', () => {
    expect(parseOrderNo('26-1003-2')).toEqual({ intakeNo: '26-1003', branchNo: 2 })
    expect(formatOrderNo('26-1003', 2)).toBe('26-1003-2')
  })
})

describe('orderEditHref / parseOrderEditType / orderEditNoticeText', () => {
  it('処理区分・受注No.・お知らせを URL に付ける', () => {
    expect(orderEditHref({})).toBe('/orders/edit')
    expect(orderEditHref({ type: 'edit', no: '26-1003-1' })).toBe('/orders/edit?type=1&no=26-1003-1')
    expect(orderEditHref({ type: 'delete', notice: 'deleted', no: '26-1003-1' })).toBe(
      '/orders/edit?type=2&no=26-1003-1&notice=deleted'
    )
  })

  it('?type=2 だけ削除、それ以外は変更', () => {
    expect(parseOrderEditType('2')).toBe('delete')
    expect(parseOrderEditType('1')).toBe('edit')
    expect(parseOrderEditType(undefined)).toBe('edit')
  })

  it('お知らせの文', () => {
    expect(orderEditNoticeText('updated', '26-1003-1')).toBe('受注No. 26-1003-1 の変更を保存しました')
    expect(orderEditNoticeText('deleted', '26-1003-1')).toBe('受注No. 26-1003-1 を削除しました')
    expect(orderEditNoticeText('x', undefined)).toBeNull()
  })
})
