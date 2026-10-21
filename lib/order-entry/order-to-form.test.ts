import { describe, expect, it } from 'vitest'
import type { CodeOption } from '@/lib/code-input/code-option'
import { SAME_AS_CUSTOMER_OPTION } from './constants'
import { EMPTY_ITEM_VALUES } from './item-row'
import {
  cutRegionCodeOf,
  headerValuesFromOrder,
  itemRowsFromOrder,
  stampOverridesFor,
  type StoredItem,
  type StoredOrderHeader,
  type StoredProcess,
} from './order-to-form'
import { resolveItemRow } from './resolve-item'
import { ITEM_MASTERS } from './test-fixtures'
import type { HeaderMasterOptions } from './use-order-header'

const option = (code: string, label: string, value: string): CodeOption<string> => ({ code, label, value })

const HEADER_MASTERS: HeaderMasterOptions = {
  customers: [option('1001', 'A製作所', 'c1')],
  destinations: [SAME_AS_CUSTOMER_OPTION, option('2001', '第1工場', 'd1')],
  deliveryMethods: [option('0', '宵積み', 'm0'), option('9', 'フリー', 'm9')],
  deliveryMethodIdsRequiringNote: ['m9'],
  sites: [option('1', '本社', 's1'), option('2', 'A営業所', 's2')],
  staff: [option('U00001', '田中', 'user-1')],
}

const HEADER: StoredOrderHeader = {
  orderDate: '2026-10-20',
  memberClass: 'GPL',
  jointNo: null,
  spliceShot: null,
  staffId: 'user-1',
  isUrgent: true,
  customerId: 'c1',
  customerContact: '佐藤様',
  deliveryDestinationId: 'd1',
  projectName: '○○ポンプ設備工事',
  dueDateType: '確定',
  dueDate: '2026-10-30',
  deliveryMethodId: 'm9',
  deliveryMethodNote: '午前中',
  siteId: 's2',
}

const item = (overrides: Partial<StoredItem> = {}): StoredItem => ({
  lineNo: 1,
  productId: 'p-ss400-9-std',
  cuttingMethod: 'レーザー',
  cuttingType: '寸法切',
  specialProductTypeId: null,
  plateSize: null,
  steelMaking: '電炉材',
  width: 300,
  length: 1500,
  outerDiameter: null,
  innerDiameter: null,
  quantity: 4,
  manufacturerSpecifiedId: null,
  processes: [],
  ...overrides,
})

const process = (overrides: Partial<StoredProcess> = {}): StoredProcess => ({
  lineNo: 1,
  processTypeId: 'proc-shot',
  spec: null,
  specFields: null,
  quantity: null,
  unitPrice: null,
  priceUnit: '個',
  ...overrides,
})

describe('headerValuesFromOrder', () => {
  it('id・値を、打つ番号・文字に戻す（処理区分は 1 変更）', () => {
    expect(headerValuesFromOrder(HEADER, HEADER_MASTERS)).toEqual({
      processingType: '1',
      memberClass: '2',
      jointNo: '',
      spliceShot: '',
      orderDate: '2026-10-20',
      staffId: 'U00001',
      isUrgent: '1',
      customerId: '1001',
      customerContact: '佐藤様',
      deliveryDestinationId: '2001',
      projectName: '○○ポンプ設備工事',
      dueDateType: '1',
      dueDate: '2026-10-30',
      deliveryMethodId: '9',
      deliveryMethodNote: '午前中',
      siteId: '2',
    })
  })

  it('入れ先が NULL なら 0 売り先と同じ、スプライスは継手番号とショットを戻す', () => {
    const values = headerValuesFromOrder(
      { ...HEADER, memberClass: 'SPL', jointNo: 'AB12', spliceShot: false, deliveryDestinationId: null },
      HEADER_MASTERS
    )
    expect(values.deliveryDestinationId).toBe('0')
    expect(values.memberClass).toBe('4')
    expect(values.jointNo).toBe('AB12')
    expect(values.spliceShot).toBe('0')
  })

  it('マスタから消えた値は空にする（画面の確認でエラーになる）', () => {
    expect(headerValuesFromOrder({ ...HEADER, customerId: 'gone' }, HEADER_MASTERS).customerId).toBe('')
  })
})

describe('cutRegionCodeOf', () => {
  it('寸法切・アイトレ（シャーは型切り）', () => {
    expect(cutRegionCodeOf(item(), ITEM_MASTERS, false)).toBe('41')
    expect(cutRegionCodeOf(item({ cuttingMethod: 'シャーリング', cuttingType: 'アイトレ' }), ITEM_MASTERS, false)).toBe('12')
  })

  it('定尺売りは切断方法 NULL から 71', () => {
    expect(cutRegionCodeOf(item({ cuttingMethod: null, cuttingType: null, plateSize: '5x10' }), ITEM_MASTERS, false)).toBe('71')
  })

  it('特殊製品は切断方法＋種別の番号', () => {
    expect(
      cutRegionCodeOf(item({ cuttingMethod: 'ガス', cuttingType: null, specialProductTypeId: 'sp-sasara' }), ITEM_MASTERS, false)
    ).toBe('25')
  })

  it('スプライス専用の受注の明細は、スプライスの種別と切断区分から', () => {
    expect(
      cutRegionCodeOf(
        item({ cuttingMethod: 'レーザー', cuttingType: 'アイトレ', specialProductTypeId: 'sp-splice' }),
        ITEM_MASTERS,
        true
      )
    ).toBe('42')
  })

  it('当てはまらなければ空', () => {
    expect(cutRegionCodeOf(item({ cuttingType: 'その他' }), ITEM_MASTERS, false)).toBe('')
  })
})

describe('itemRowsFromOrder', () => {
  it('材料の行を、種類・材質・板厚・製鋼法・メーカー・寸法・数量に戻す', () => {
    const [row] = itemRowsFromOrder([item()], ITEM_MASTERS, false)
    expect(row).toEqual({
      ...EMPTY_ITEM_VALUES,
      key: 'order-line-1',
      cutRegion: '41',
      plateType: '0',
      material: '0',
      steelMaking: '1',
      manufacturer: '0',
      thickness: '9',
      width: '300',
      length: '1500',
      quantity: '4',
    })
  })

  it('縞板はメーカー、定尺は定尺サイズ、ベタ丸は直径を戻す', () => {
    const rows = itemRowsFromOrder(
      [
        item({ lineNo: 1, productId: 'p-check-3.2-std', manufacturerSpecifiedId: 'maker-a', steelMaking: null }),
        item({ lineNo: 2, cuttingMethod: null, cuttingType: null, plateSize: '4x8', width: null, length: null }),
        item({
          lineNo: 3,
          cuttingMethod: 'ガス',
          cuttingType: null,
          specialProductTypeId: 'sp-betamaru',
          width: null,
          length: null,
          outerDiameter: 600,
        }),
      ],
      ITEM_MASTERS,
      false
    )
    expect(rows[0]).toMatchObject({ plateType: '1', manufacturer: '1', thickness: '3.2', steelMaking: '1' })
    expect(rows[1]).toMatchObject({ cutRegion: '71', plateSize: '2', width: '', length: '' })
    expect(rows[2]).toMatchObject({ cutRegion: '27', outerDiameter: '600' })
  })

  it('加工の行を母材のすぐ下に、行番号の順で並べる（穴・曲げ・自由入力）', () => {
    const rows = itemRowsFromOrder(
      [
        item({
          lineNo: 2,
          processes: [
            process({ lineNo: 2, processTypeId: 'proc-bend', specFields: { shape: '曲げ', bend_count: 2, bend_style: '二方', bend_style_note: null } }),
            process({ lineNo: 1, processTypeId: 'proc-kiri', specFields: { shape: '穴', holes_per_piece: 12, hole_diameter: 38 } }),
          ],
        }),
        item({
          lineNo: 1,
          processes: [process({ processTypeId: 'proc-shot', spec: 'ショット 両面', quantity: 3, unitPrice: 500, priceUnit: 'kg' })],
        }),
      ],
      ITEM_MASTERS,
      false
    )
    expect(rows.map((row) => row.key)).toEqual([
      'order-line-1',
      'order-line-1-process-1',
      'order-line-2',
      'order-line-2-process-1',
      'order-line-2-process-2',
    ])
    expect(rows[1]).toMatchObject({ cutRegion: '9', processType: '22', spec: 'ショット 両面', quantity: '3', unitPrice: '500', priceUnit: '2' })
    expect(rows[3]).toMatchObject({ processType: '20', holesPerPiece: '12', holeDiameter: '38', quantity: '' })
    expect(rows[4]).toMatchObject({ processType: '24', bendCount: '2', bendCountFree: '', bendStyle: '2', bendStyleFree: '' })
  })

  it('曲げのヶ所が選択肢にない数なら 9 フリー＋ヶ所数、曲げ方フリーは文字も戻す', () => {
    const [, row] = itemRowsFromOrder(
      [
        item({
          processes: [
            process({ processTypeId: 'proc-bend', specFields: { shape: '曲げ', bend_count: 6, bend_style: 'フリー', bend_style_note: 'R' } }),
          ],
        }),
      ],
      ITEM_MASTERS,
      false
    )
    expect(row).toMatchObject({ bendCount: '9', bendCountFree: '6', bendStyle: '9', bendStyleFree: 'R' })
  })
})

describe('stampOverridesFor', () => {
  it('指定スタンプとの違いだけを付け外しの形にする', () => {
    expect(stampOverridesFor(['s1', 's3'], new Set(['s1', 's2']))).toEqual({ s2: false, s3: true })
  })

  it('指定スタンプどおりなら何も付け外ししない', () => {
    expect(stampOverridesFor(['s1'], new Set(['s1']))).toEqual({})
  })
})

describe('戻した行をもう一度解釈すると、保存した値になる', () => {
  it('材料の行（寸法切・特殊製品）', () => {
    const stored = [
      item({ lineNo: 1 }),
      item({ lineNo: 2, cuttingMethod: 'ガス', cuttingType: null, specialProductTypeId: 'sp-sasara', steelMaking: '高炉材' }),
    ]
    const rows = itemRowsFromOrder(stored, ITEM_MASTERS, false)
    const first = resolveItemRow(rows[0], ITEM_MASTERS)
    expect(first.cuttingMethod).toBe('レーザー')
    expect(first.region).toEqual({ kind: 'cut', cuttingType: '寸法切' })
    expect(first.productSelection).toMatchObject({ ok: true, product: { id: 'p-ss400-9-std' } })
    expect(first.dimensions).toMatchObject({ width: 300, length: 1500 })
    expect(first.quantity).toBe(4)

    const second = resolveItemRow(rows[1], ITEM_MASTERS)
    expect(second.cuttingMethod).toBe('ガス')
    expect(second.region).toMatchObject({ kind: 'special', type: { id: 'sp-sasara' } })
    expect(second.steelMaking).toBe('高炉材')
  })
})
