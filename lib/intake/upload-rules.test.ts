import { describe, expect, it } from 'vitest'
import {
  MAX_UPLOAD_BYTES,
  storagePathFor,
  uploadContentTypeFor,
  uploadKindFor,
  uploadRejectionReason,
  csvRejectionReason,
} from './upload-rules'

describe('uploadRejectionReason', () => {
  it('PDF・DXF で 50MB 以下なら入れられる', () => {
    expect(uploadRejectionReason({ name: '注文書.pdf', size: 1000 })).toBeNull()
    expect(uploadRejectionReason({ name: 'a.DXF', size: MAX_UPLOAD_BYTES })).toBeNull()
  })

  it('PDF・DXF 以外は入れられない', () => {
    expect(uploadRejectionReason({ name: 'a.xlsx', size: 1000 })).toBe('PDF か DXF のファイルを入れてください')
  })

  it('50MB を超えると入れられない', () => {
    expect(uploadRejectionReason({ name: 'a.pdf', size: MAX_UPLOAD_BYTES + 1 })).toBe('1 ファイル 50MB までです')
  })

  it('空のファイルは入れられない', () => {
    expect(uploadRejectionReason({ name: 'a.pdf', size: 0 })).toBe('中身が空のファイルです')
  })
})

describe('uploadKindFor / uploadContentTypeFor', () => {
  it('PDF は注文書、DXF は元データ', () => {
    expect(uploadKindFor('a.pdf')).toBe('order_pdf')
    expect(uploadKindFor('a.dxf')).toBe('original')
    expect(uploadContentTypeFor('a.PDF')).toBe('application/pdf')
    expect(uploadContentTypeFor('a.dxf')).toBe('application/octet-stream')
  })

  it('CAD の CSV は text/csv', () => {
    expect(uploadContentTypeFor('部品.CSV')).toBe('text/csv')
  })
})

describe('csvRejectionReason', () => {
  it('CSV で 50MB 以下なら入れられる', () => {
    expect(csvRejectionReason({ name: '部品.csv', size: 1000 })).toBeNull()
    expect(csvRejectionReason({ name: 'a.CSV', size: MAX_UPLOAD_BYTES })).toBeNull()
  })

  it('CSV 以外は入れられない（DXF・PDF も）', () => {
    expect(csvRejectionReason({ name: 'a.dxf', size: 1000 })).toBe('CSV のファイルを入れてください')
    expect(csvRejectionReason({ name: 'a.pdf', size: 1000 })).toBe('CSV のファイルを入れてください')
  })

  it('50MB を超える・空のファイルは入れられない', () => {
    expect(csvRejectionReason({ name: 'a.csv', size: MAX_UPLOAD_BYTES + 1 })).toBe('1 ファイル 50MB までです')
    expect(csvRejectionReason({ name: 'a.csv', size: 0 })).toBe('中身が空のファイルです')
  })
})

describe('storagePathFor', () => {
  it('{受付の id}/{ファイルの id}.{拡張子}（拡張子は小文字）', () => {
    expect(storagePathFor('intake', 'file', '注文書.PDF')).toBe('intake/file.pdf')
  })

  it('拡張子がなければ付けない', () => {
    expect(storagePathFor('intake', 'file', 'noext')).toBe('intake/file')
  })
})
