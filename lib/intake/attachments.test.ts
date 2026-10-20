import { describe, expect, it } from 'vitest'
import {
  attachmentTypeLabel,
  fileExtension,
  formatFileSize,
  needsConversion,
  summarizeAttachments,
} from './attachments'

describe('fileExtension', () => {
  it('拡張子を小文字で返す', () => {
    expect(fileExtension('注文書.PDF')).toBe('pdf')
    expect(fileExtension('PL9-297x1530.dxf')).toBe('dxf')
  })

  it('点が複数あれば最後の点の後ろ', () => {
    expect(fileExtension('a.b.dxf')).toBe('dxf')
  })

  it('拡張子がなければ空文字', () => {
    expect(fileExtension('README')).toBe('')
    expect(fileExtension('.hidden')).toBe('')
    expect(fileExtension('name.')).toBe('')
  })
})

describe('needsConversion', () => {
  it('元データで DXF でなければ要変換', () => {
    expect(needsConversion({ kind: 'original', originalName: '組立図.xyz' })).toBe(true)
  })

  it('元データでも DXF なら要変換ではない', () => {
    expect(needsConversion({ kind: 'original', originalName: '部品.dxf' })).toBe(false)
  })

  it('注文書は要変換ではない', () => {
    expect(needsConversion({ kind: 'order_pdf', originalName: '注文書.xyz' })).toBe(false)
  })
})

describe('summarizeAttachments', () => {
  it('PDF・DXF・要変換・その他を数える', () => {
    expect(
      summarizeAttachments([
        { kind: 'order_pdf', originalName: '注文書.pdf' },
        { kind: 'original', originalName: 'a.dxf' },
        { kind: 'original', originalName: 'b.DXF' },
        { kind: 'original', originalName: 'c.xyz' },
        { kind: 'csv', originalName: 'parts.csv' },
      ])
    ).toEqual({ pdf: 1, dxf: 2, conversion: 1, other: 1 })
  })
})

describe('attachmentTypeLabel', () => {
  it('拡張子を大文字にする。なければ「ファイル」', () => {
    expect(attachmentTypeLabel('a.pdf')).toBe('PDF')
    expect(attachmentTypeLabel('a')).toBe('ファイル')
  })
})

describe('formatFileSize', () => {
  it('大きさに合わせて単位を変える', () => {
    expect(formatFileSize(500)).toBe('500B')
    expect(formatFileSize(320 * 1024)).toBe('320KB')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5MB')
    expect(formatFileSize(null)).toBe('')
  })
})
