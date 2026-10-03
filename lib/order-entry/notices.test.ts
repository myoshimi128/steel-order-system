import { describe, expect, it } from 'vitest'
import { INITIAL_ITEM_ROW } from './item-row'
import {
  customerNoticesFor,
  matchesRange,
  orderNoticeConditions,
  processNoticeTargetOf,
  processNoticesFor,
  type CustomerNoticeMaster,
  type ProcessNoticeMaster,
} from './notices'
import { ITEM_MASTERS, itemRow } from './test-fixtures'
import { checkRows } from './validate-order-items'

// 行の ID を指定して行を作る
function keyed(key: string, values: Parameters<typeof itemRow>[0]) {
  return { ...itemRow(values), key }
}

// レーザー（3）・寸法切・SS400 9mm の材料の行
const LASER_ROW = { cuttingMethod: '3', region: '1', material: '0', thickness: '9', width: '100', length: '200', quantity: '10' }
// キリ孔（20）の加工の行
const KIRI_ROW = { region: '9', processType: '20', holesPerPiece: '4', holeDiameter: '32' }

const CUSTOMER = 'customer-1'

// 得意先の注意事項の行を作る（指定しない条件は NULL）
function notice(
  id: string,
  values: Partial<CustomerNoticeMaster> = {},
): CustomerNoticeMaster {
  return {
    id,
    customer_id: CUSTOMER,
    cutting_method: null,
    process_type_id: null,
    body: `本文 ${id}`,
    priority: 0,
    ...values,
  }
}

function conditionsOf(rows: ReturnType<typeof keyed>[], customerId: string | null = CUSTOMER) {
  return orderNoticeConditions(customerId, checkRows(rows, ITEM_MASTERS, INITIAL_ITEM_ROW))
}

describe('customerNoticesFor（得意先の注意事項）', () => {
  const notices = [
    notice('only-customer'),
    notice('laser', { cutting_method: 'レーザー' }),
    notice('gas', { cutting_method: 'ガス' }),
    notice('kiri', { process_type_id: 'proc-kiri' }),
    notice('laser-kiri', { cutting_method: 'レーザー', process_type_id: 'proc-kiri' }),
    notice('other-customer', { customer_id: 'customer-2' }),
  ]

  it('指定した条件がすべて受注に当てはまるものだけを出す', () => {
    const ids = customerNoticesFor(
      notices,
      conditionsOf([keyed('m1', LASER_ROW), keyed('p1', KIRI_ROW)]),
      ITEM_MASTERS.processTypes,
    ).map((item) => item.id)
    expect(ids).toEqual(['only-customer', 'laser', 'kiri', 'laser-kiri'])
  })

  it('加工の行がなければ、加工種別を指定した注意事項は出さない', () => {
    const ids = customerNoticesFor(notices, conditionsOf([keyed('m1', LASER_ROW)]), ITEM_MASTERS.processTypes).map(
      (item) => item.id,
    )
    expect(ids).toEqual(['only-customer', 'laser'])
  })

  it('得意先を選んでいなければ何も出さない', () => {
    expect(
      customerNoticesFor(notices, conditionsOf([keyed('m1', LASER_ROW)], null), ITEM_MASTERS.processTypes),
    ).toEqual([])
  })

  it('印は指定した条件を並べる', () => {
    const labels = customerNoticesFor(
      notices,
      conditionsOf([keyed('m1', LASER_ROW), keyed('p1', KIRI_ROW)]),
      ITEM_MASTERS.processTypes,
    ).map((item) => item.label)
    expect(labels).toEqual(['得意先', '得意先 × レーザー', '得意先 × キリ孔', '得意先 × レーザー × キリ孔'])
  })

  it('表示順（priority）の小さい順に並べる', () => {
    const ids = customerNoticesFor(
      [notice('later', { priority: 5 }), notice('first', { priority: -1 })],
      conditionsOf([keyed('m1', LASER_ROW)]),
      ITEM_MASTERS.processTypes,
    ).map((item) => item.id)
    expect(ids).toEqual(['first', 'later'])
  })

  it('定尺売りは切断方法の条件に含めない', () => {
    const conditions = conditionsOf([
      keyed('m1', { cuttingMethod: '9', region: '3', material: '0', thickness: '9', plateSize: '1', quantity: '1' }),
    ])
    expect([...conditions.cuttingMethods]).toEqual([])
  })
})

describe('matchesRange（範囲の判定）', () => {
  it('範囲は以上・以下（境界の値を含む）', () => {
    expect(matchesRange(13, 13, null)).toBe(true)
    expect(matchesRange(12, 13, null)).toBe(false)
    expect(matchesRange(16, 9, 16)).toBe(true)
  })

  it('範囲を指定しなければ当てはまる。指定しているのに値がなければ当てはまらない', () => {
    expect(matchesRange(null, null, null)).toBe(true)
    expect(matchesRange(null, 13, null)).toBe(false)
  })
})

describe('processNoticesFor（加工の注意事項）', () => {
  const processNotices: ProcessNoticeMaster[] = [
    // キリ孔・穴径 30φ 以上 →「精度注意」
    {
      id: 'kiri-30',
      process_type_id: 'proc-kiri',
      thickness_min: null,
      thickness_max: null,
      hole_diameter_min: 30,
      hole_diameter_max: null,
      body: '精度注意',
    },
    // 曲げ・板厚 13mm 以上 →「12mm を超える曲げは要確認」
    {
      id: 'bend-13',
      process_type_id: 'proc-bend',
      thickness_min: 13,
      thickness_max: null,
      hole_diameter_min: null,
      hole_diameter_max: null,
      body: '12mm を超える曲げは要確認',
    },
  ]

  // 材料の行（母材）の下に加工の行を 1 行置いたときの、加工の行に当てはまる注意事項の id
  function noticeIdsFor(material: Parameters<typeof itemRow>[0], process: Parameters<typeof itemRow>[0]) {
    const rows = [keyed('m1', material), keyed('p1', process)]
    const checks = checkRows(rows, ITEM_MASTERS, INITIAL_ITEM_ROW)
    return processNoticesFor(processNotices, processNoticeTargetOf(rows, checks, 1)).map((item) => item.id)
  }

  it('穴径は加工の行の入力で判定する', () => {
    expect(noticeIdsFor(LASER_ROW, KIRI_ROW)).toEqual(['kiri-30'])
    expect(noticeIdsFor(LASER_ROW, { ...KIRI_ROW, holeDiameter: '22' })).toEqual([])
  })

  it('穴径を入力する前は、穴径の条件のある注意事項は出さない', () => {
    expect(noticeIdsFor(LASER_ROW, { ...KIRI_ROW, holeDiameter: '' })).toEqual([])
  })

  it('板厚は母材（材料の行）の板厚で判定する', () => {
    const bend = { region: '9', processType: '24' }
    expect(noticeIdsFor({ ...LASER_ROW, thickness: '16' }, bend)).toEqual(['bend-13'])
    expect(noticeIdsFor(LASER_ROW, bend)).toEqual([])
  })
})
