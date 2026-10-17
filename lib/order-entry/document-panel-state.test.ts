import { describe, expect, it } from 'vitest'
import {
  displayPanelWidth,
  maxPanelWidth,
  panelOpenCookieString,
  parsePanelOpenCookie,
  parsePanelWidthCookie,
} from './document-panel-state'

// 1280px の画面: サイドメニューを閉じた中身 1216px から左右の余白 24px ずつを除いた 1168px
const WIDTH_1280 = 1168

describe('maxPanelWidth', () => {
  it('1280px の画面では、明細の表が収まるよう最大 326px', () => {
    expect(maxPanelWidth(WIDTH_1280)).toBe(326)
  })

  it('狭すぎる画面でも最小の 240px は取る', () => {
    expect(maxPanelWidth(800)).toBe(240)
  })
})

describe('displayPanelWidth', () => {
  it('保存がなければ、取れる範囲で最も広い幅', () => {
    expect(displayPanelWidth(null, WIDTH_1280)).toBe(326)
    expect(displayPanelWidth(null, 1568)).toBe(726)
  })

  it('保存した幅が今の画面で広すぎるときは、収まる幅に縮める', () => {
    expect(displayPanelWidth(600, WIDTH_1280)).toBe(326)
  })

  it('保存した幅が最小より狭いときは最小の幅', () => {
    expect(displayPanelWidth(100, 1568)).toBe(240)
  })

  it('範囲の中なら保存した幅のまま', () => {
    expect(displayPanelWidth(500, 1568)).toBe(500)
  })
})

describe('cookie の読み書き', () => {
  it('幅は数字だけを読む', () => {
    expect(parsePanelWidthCookie('420')).toBe(420)
    expect(parsePanelWidthCookie('abc')).toBeNull()
    expect(parsePanelWidthCookie(undefined)).toBeNull()
  })

  it('開閉は保存がなければ開いた状態', () => {
    expect(parsePanelOpenCookie(undefined)).toBe(true)
    expect(parsePanelOpenCookie('0')).toBe(false)
    expect(panelOpenCookieString(false)).toBe('order_doc_panel_open=0; path=/; max-age=31536000; samesite=lax')
  })
})
